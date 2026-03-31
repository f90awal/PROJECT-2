import type { Context } from "hono";
import { treeifyError } from "zod";
import { isUniqueCallSignError } from "./call-sign-error";
import { RegisterVehicleSchema, UpdateVehicleLocationSchema } from "./dto";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";
import { publishTrackingUpdate } from "./tracking-bus";

function parseVehicleId(c: Context): number | Response {
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id) || id < 1) {
		return c.json({ detail: "vehicle id must be a positive integer" }, 400);
	}
	return id;
}

export async function registerVehicle(c: Context) {
	const parsed = RegisterVehicleSchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json({ detail: treeifyError(parsed.error) }, 400);
	}

	const { callSign, type, stationId, status } = parsed.data;

	const station = await prisma.station.findUnique({
		where: { id: stationId },
		select: { id: true },
	});
	if (!station) return c.json({ detail: "station not found" }, 404);

	try {
		const vehicle = await prisma.$transaction(async (tx) => {
			const created = await tx.vehicle.create({
				data: { callSign, type, stationId, status },
				include: { station: true, driver: true },
			});

			await publishOutboxEvent(tx, {
				aggregateType: "vehicle",
				aggregateId: String(created.id),
				eventType: "VehicleRegistered",
				payload: {
					id: created.id,
					callSign: created.callSign,
					type: created.type,
					status: created.status,
					stationId: created.stationId,
					createdAt: created.createdAt,
				},
			});

			return created;
		});

		return c.json(vehicle, 201);
	} catch (error) {
		if (isUniqueCallSignError(error)) {
			return c.json({ detail: "callSign already exists" }, 409);
		}
		throw error;
	}
}

export async function getAllVehicles(c: Context) {
	const vehicles = await prisma.vehicle.findMany({
		include: {
			station: true,
			driver: true,
			locations: { orderBy: { recordedAt: "desc" }, take: 1 },
		},
		orderBy: { id: "asc" },
	});
	return c.json(vehicles);
}

export async function getVehicle(c: Context) {
	const parsedId = parseVehicleId(c);
	if (parsedId instanceof Response) return parsedId;
	const id = parsedId;

	const vehicle = await prisma.vehicle.findUnique({
		where: { id },
		include: {
			station: true,
			driver: true,
			locations: { orderBy: { recordedAt: "desc" }, take: 1 },
		},
	});
	if (!vehicle) return c.json({ detail: "vehicle not found" }, 404);

	return c.json(vehicle);
}

export async function getVehicleLocation(c: Context) {
	const parsedId = parseVehicleId(c);
	if (parsedId instanceof Response) return parsedId;
	const id = parsedId;

	const cursor = c.req.query("cursor");
	const limit = Number(c.req.query("limit") ?? 50);
	const from = c.req.query("from");
	const to = c.req.query("to");

	if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
		return c.json(
			{ detail: "limit must be an integer between 1 and 200" },
			400,
		);
	}

	let fromDate: Date | undefined;
	let toDate: Date | undefined;

	if (from) {
		fromDate = new Date(from);
		if (Number.isNaN(fromDate.getTime())) {
			return c.json({ detail: "from must be a valid ISO date" }, 400);
		}
	}

	if (to) {
		toDate = new Date(to);
		if (Number.isNaN(toDate.getTime())) {
			return c.json({ detail: "to must be a valid ISO date" }, 400);
		}
	}

	let cursorId: number | undefined;
	if (cursor !== undefined) {
		cursorId = Number(cursor);
		if (!Number.isInteger(cursorId) || cursorId < 1) {
			return c.json({ detail: "cursor must be a positive integer" }, 400);
		}
	}

	const locations = await prisma.vehicleLocation.findMany({
		where: {
			vehicleId: id,
			id: cursorId ? { lt: cursorId } : undefined,
			recordedAt: {
				gte: fromDate,
				lte: toDate,
			},
		},
		orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
		take: limit,
	});

	if (locations.length === 0) {
		return c.json({ items: [], nextCursor: null });
	}

	const nextCursor =
		locations.length === limit ? (locations.at(-1)?.id ?? null) : null;

	return c.json({ items: locations, nextCursor });
}

export async function updateVehicleLocation(c: Context) {
	const parsedId = parseVehicleId(c);
	if (parsedId instanceof Response) return parsedId;
	const id = parsedId;

	const parsed = UpdateVehicleLocationSchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json({ detail: treeifyError(parsed.error) }, 400);
	}

	const vehicle = await prisma.vehicle.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!vehicle) return c.json({ detail: "vehicle not found" }, 404);

	const { lat, lng, speed, heading, recordedAt } = parsed.data;

	const location = await prisma.$transaction(async (tx) => {
		const created = await tx.vehicleLocation.create({
			data: {
				vehicleId: id,
				lat,
				lng,
				speed,
				heading,
				recordedAt: recordedAt ? new Date(recordedAt) : undefined,
			},
		});

		await tx.vehicle.update({
			where: { id },
			data: { updatedAt: new Date() },
		});

		return created;
	});

	await publishTrackingUpdate({
		type: "vehicle.location.updated",
		vehicleId: id,
		lat: location.lat,
		lng: location.lng,
		speed: location.speed,
		heading: location.heading,
		recordedAt: location.recordedAt,
	});

	return c.json(location, 201);
}
