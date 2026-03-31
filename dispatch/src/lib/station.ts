import type { Context } from "hono";
import { treeifyError } from "zod";
import {
	type StationType,
	VehicleStatus,
	VehicleType,
} from "../generated/prisma/enums";
import { RegisterStationSchema, SeedStationsSchema } from "./dto";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";
import { publishTrackingUpdate } from "./tracking-bus";

const TYPE_TO_VEHICLE: Record<StationType, VehicleType> = {
	ambulance: VehicleType.ambulance,
	fire: VehicleType.fire_truck,
	police: VehicleType.police_car,
};

const TYPE_TO_PREFIX: Record<StationType, string> = {
	ambulance: "AMB",
	fire: "FIR",
	police: "POL",
};

function jitter(base: number, factor: number) {
	return base + factor;
}

function makePhone(index: number) {
	const suffix = String(100000 + index).slice(-6);
	return `+23320${suffix}`;
}

async function findNextCallSign(prefix: string) {
	const latest = await prisma.vehicle.findFirst({
		where: { callSign: { startsWith: `${prefix}-` } },
		orderBy: { id: "desc" },
		select: { callSign: true },
	});

	const current = latest?.callSign
		? Number(latest.callSign.split("-")[1] ?? 0)
		: 0;

	return Number.isFinite(current) ? current + 1 : 1;
}

type ProvisionedVehicle = {
	id: number;
	callSign: string;
	lat: number;
	lng: number;
};

async function provisionStation(
	tx: Parameters<typeof prisma.$transaction>[0] extends (
		arg: infer A,
	) => unknown
		? A
		: never,
	input: {
		name: string;
		type: StationType;
		location: { address: string; lat: number; lng: number };
		respondersCount: 3 | 4;
	},
) {
	const { name, type, location, respondersCount } = input;
	const vehicleType = TYPE_TO_VEHICLE[type];
	const prefix = TYPE_TO_PREFIX[type];
	const startCounter = await findNextCallSign(prefix);

	const station = await tx.station.create({
		data: { name, type, location },
	});

	const vehicles: ProvisionedVehicle[] = [];

	for (let i = 0; i < respondersCount; i++) {
		const number = String(startCounter + i).padStart(3, "0");
		const callSign = `${prefix}-${number}`;

		const vehicle = await tx.vehicle.create({
			data: {
				callSign,
				type: vehicleType,
				status: VehicleStatus.available,
				stationId: station.id,
			},
		});

		await tx.driver.create({
			data: {
				name: `${name} Responder ${i + 1}`,
				phone: makePhone(station.id * 10 + i + 1),
				vehicleId: vehicle.id,
			},
		});

		const lat = jitter(location.lat, i * 0.0006);
		const lng = jitter(location.lng, i * 0.0006);

		await tx.vehicleLocation.create({
			data: {
				vehicleId: vehicle.id,
				lat,
				lng,
				speed: 0,
				heading: 0,
			},
		});

		vehicles.push({ id: vehicle.id, callSign: vehicle.callSign, lat, lng });
	}

	await publishOutboxEvent(tx, {
		aggregateType: "station",
		aggregateId: String(station.id),
		eventType: "StationProvisioned",
		payload: {
			stationId: station.id,
			stationName: station.name,
			stationType: station.type,
			respondersCount,
			vehicleType,
			capturedAt: new Date().toISOString(),
		},
	});

	return {
		station,
		respondersCount,
		vehicleType,
		vehicles,
	};
}

export async function getAllStations(c: Context) {
	const stations = await prisma.station.findMany({
		include: {
			vehicles: {
				include: {
					driver: true,
					locations: {
						orderBy: { recordedAt: "desc" },
						take: 1,
					},
				},
			},
		},
		orderBy: { id: "asc" },
	});

	return c.json(stations);
}

export async function registerStation(c: Context) {
	const parsed = RegisterStationSchema.safeParse(
		await c.req.json().catch(() => null),
	);

	if (!parsed.success) {
		return c.json({ detail: treeifyError(parsed.error) }, 400);
	}

	const created = await prisma.$transaction((tx) =>
		provisionStation(tx, parsed.data),
	);

	for (const vehicle of created.vehicles) {
		await publishTrackingUpdate({
			type: "vehicle.location.updated",
			vehicleId: vehicle.id,
			lat: vehicle.lat,
			lng: vehicle.lng,
			speed: 0,
			heading: 0,
			recordedAt: new Date().toISOString(),
		});
	}

	return c.json(
		{
			station: created.station,
			respondersCount: created.respondersCount,
			vehicleType: created.vehicleType,
			vehicles: created.vehicles,
		},
		201,
	);
}

export async function seedStations(c: Context) {
	const parsed = SeedStationsSchema.safeParse(
		await c.req.json().catch(() => ({})),
	);

	if (!parsed.success) {
		return c.json({ detail: treeifyError(parsed.error) }, 400);
	}

	const { profile, reset } = parsed.data;

	if (reset) {
		await prisma.$transaction([
			prisma.outbox.deleteMany(),
			prisma.driverLocation.deleteMany(),
			prisma.vehicleLocation.deleteMany(),
			prisma.dispatch.deleteMany(),
			prisma.driver.deleteMany(),
			prisma.vehicle.deleteMany(),
			prisma.station.deleteMany(),
		]);
	}

	const seedConfig =
		profile === "small"
			? [
					{
						name: "Accra Central EMS Station",
						type: "ambulance" as const,
						respondersCount: 3 as const,
						location: {
							address: "Ring Road Central, Accra",
							lat: 5.5602,
							lng: -0.2056,
						},
					},
				]
			: [
					{
						name: "Accra Central EMS Station",
						type: "ambulance" as const,
						respondersCount: 4 as const,
						location: {
							address: "Ring Road Central, Accra",
							lat: 5.5602,
							lng: -0.2056,
						},
					},
					{
						name: "Airport Fire Station",
						type: "fire" as const,
						respondersCount: 4 as const,
						location: {
							address: "Kotoka International Airport, Accra",
							lat: 5.6049,
							lng: -0.1668,
						},
					},
					{
						name: "Cantonments Police Station",
						type: "police" as const,
						respondersCount: 4 as const,
						location: {
							address: "Cantonments, Accra",
							lat: 5.5738,
							lng: -0.1659,
						},
					},
				];

	const created = [] as Array<Awaited<ReturnType<typeof provisionStation>>>;

	for (const config of seedConfig) {
		const seeded = await prisma.$transaction((tx) =>
			provisionStation(tx, config),
		);
		created.push(seeded);
	}

	for (const seeded of created) {
		for (const vehicle of seeded.vehicles) {
			await publishTrackingUpdate({
				type: "vehicle.location.updated",
				vehicleId: vehicle.id,
				lat: vehicle.lat,
				lng: vehicle.lng,
				speed: 0,
				heading: 0,
				recordedAt: new Date().toISOString(),
			});
		}
	}

	return c.json({
		profile,
		reset,
		stationsCreated: created.length,
		vehiclesCreated: created.reduce(
			(sum, item) => sum + item.vehicles.length,
			0,
		),
		respondersCreated: created.reduce(
			(sum, item) => sum + item.respondersCount,
			0,
		),
		stations: created.map((item) => ({
			id: item.station.id,
			name: item.station.name,
			type: item.station.type,
			respondersCount: item.respondersCount,
			vehicleType: item.vehicleType,
		})),
	});
}
