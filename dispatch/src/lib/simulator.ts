import { DispatchStatus, VehicleStatus } from "../generated/prisma/enums";
import {
	clearIncidentTarget,
	getIncidentTarget,
	getOrHydrateIncidentTarget,
	pruneIncidentTargets,
} from "./incident-targets";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";
import { publishTrackingUpdate } from "./tracking-bus";
import { haversineDistanceKm } from "./utils";

const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? 8000);
const ENABLED = process.env.SIMULATION_ENABLED !== "false";
const DEBUG = process.env.SIM_DEBUG === "true";

function simLog(event: string, payload: Record<string, unknown>) {
	if (!DEBUG) return;
	console.log(`[sim:${event}] ${JSON.stringify(payload)}`);
}

function randomSpeed(status: VehicleStatus) {
	if (
		status === VehicleStatus.dispatched ||
		status === VehicleStatus.en_route
	) {
		return 55 + Math.random() * 30;
	}
	return 0;
}

function directedStep(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
	speedKmh: number,
) {
	const distanceKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
	if (distanceKm <= 0) {
		return {
			lat: from.lat,
			lng: from.lng,
			distanceKm,
			remainingKm: 0,
			heading: 0,
		};
	}

	const stepKm = Math.max(0.02, speedKmh * (INTERVAL_MS / 3_600_000));
	const fraction = Math.min(1, stepKm / distanceKm);
	const lat = from.lat + (to.lat - from.lat) * fraction;
	const lng = from.lng + (to.lng - from.lng) * fraction;
	const heading =
		((Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI + 360) %
		360;

	return {
		lat,
		lng,
		distanceKm,
		remainingKm: haversineDistanceKm(lat, lng, to.lat, to.lng),
		heading,
	};
}

async function tickVehicleLocations() {
	const vehicles = await prisma.vehicle.findMany({
		where: {
			status: {
				in: [VehicleStatus.dispatched, VehicleStatus.en_route],
			},
		},
		include: {
			station: true,
			driver: true,
			locations: { orderBy: { recordedAt: "desc" }, take: 1 },
			dispatches: {
				where: { status: DispatchStatus.active },
				orderBy: { dispatchedAt: "desc" },
				take: 1,
			},
		},
	});

	for (const vehicle of vehicles) {
		const latest = vehicle.locations[0];
		const stationLoc = vehicle.station.location as
			| { lat?: number; lng?: number }
			| undefined;

		const baseLat = latest?.lat ?? stationLoc?.lat;
		const baseLng = latest?.lng ?? stationLoc?.lng;
		if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) {
			simLog("skip.invalid_base", {
				vehicleId: vehicle.id,
				callSign: vehicle.callSign,
				baseLat,
				baseLng,
			});
			continue;
		}

		const status =
			vehicle.status === VehicleStatus.dispatched
				? VehicleStatus.en_route
				: vehicle.status;

		const speed = randomSpeed(status);

		const activeDispatch = vehicle.dispatches[0];
		let incidentTarget = activeDispatch
			? getIncidentTarget(activeDispatch.incidentId)
			: null;

		if (!incidentTarget && activeDispatch) {
			incidentTarget = await getOrHydrateIncidentTarget(
				activeDispatch.incidentId,
			);
		}

		simLog("dispatch.context", {
			vehicleId: vehicle.id,
			callSign: vehicle.callSign,
			vehicleStatus: vehicle.status,
			normalizedStatus: status,
			incidentId: activeDispatch?.incidentId ?? null,
			base: { lat: baseLat, lng: baseLng },
			target: incidentTarget
				? { lat: incidentTarget.lat, lng: incidentTarget.lng }
				: null,
			speed,
		});

		const movement =
			incidentTarget && status === VehicleStatus.en_route
				? directedStep(
						{ lat: baseLat, lng: baseLng },
						{ lat: incidentTarget.lat, lng: incidentTarget.lng },
						speed,
					)
				: null;

		if (!movement) {
			simLog("skip.no_movement", {
				vehicleId: vehicle.id,
				callSign: vehicle.callSign,
				hasDispatch: Boolean(activeDispatch),
				hasTarget: Boolean(incidentTarget),
				status,
			});
			continue;
		}

		simLog("movement.step", {
			vehicleId: vehicle.id,
			callSign: vehicle.callSign,
			from: { lat: baseLat, lng: baseLng },
			to: { lat: movement.lat, lng: movement.lng },
			heading: movement.heading,
			distanceKm: movement.distanceKm,
			remainingKm: movement.remainingKm,
			speed,
		});

		const lat = movement.lat;
		const lng = movement.lng;
		const heading = movement.heading;

		const location = await prisma.$transaction(async (tx) => {
			const created = await tx.vehicleLocation.create({
				data: {
					vehicleId: vehicle.id,
					lat,
					lng,
					speed,
					heading,
				},
			});

			if (status !== vehicle.status) {
				await tx.vehicle.update({
					where: { id: vehicle.id },
					data: { status },
				});
			}

			return created;
		});

		await publishTrackingUpdate({
			type: "vehicle.location.updated",
			vehicleId: vehicle.id,
			lat: location.lat,
			lng: location.lng,
			speed: location.speed,
			heading: location.heading,
			vehicleStatus: status,
			recordedAt: location.recordedAt,
		});

		if (activeDispatch && movement.remainingKm <= 0.12) {
			const now = new Date();

			simLog("arrival.threshold", {
				vehicleId: vehicle.id,
				callSign: vehicle.callSign,
				dispatchId: activeDispatch.id,
				incidentId: activeDispatch.incidentId,
				remainingKm: movement.remainingKm,
			});

			await prisma.$transaction(async (tx) => {
				await tx.dispatch.update({
					where: { id: activeDispatch.id },
					data: {
						status: DispatchStatus.arrived,
						arrivedAt: now,
					},
				});

				await tx.vehicle.update({
					where: { id: vehicle.id },
					data: { status: VehicleStatus.on_scene },
				});

				await publishOutboxEvent(tx, {
					aggregateType: "dispatch",
					aggregateId: String(activeDispatch.id),
					eventType: "VehicleArrived",
					payload: {
						dispatchId: activeDispatch.id,
						incidentId: activeDispatch.incidentId,
						vehicleId: vehicle.id,
						emergencyService: vehicle.station.type,
						responderId: vehicle.driver?.id ?? null,
						responderName: vehicle.driver?.name ?? null,
						region: vehicle.station.name,
						arrivedAt: now,
					},
				});
			});

			await publishTrackingUpdate({
				type: "dispatch.vehicle.arrived",
				dispatchId: activeDispatch.id,
				incidentId: activeDispatch.incidentId,
				vehicleId: vehicle.id,
				vehicleStatus: VehicleStatus.on_scene,
				recordedAt: now.toISOString(),
			});

			clearIncidentTarget(activeDispatch.incidentId);
		}
	}
}

export async function runDispatchSimulationTick() {
	pruneIncidentTargets();
	await tickVehicleLocations();
}

export function startDispatchSimulation() {
	if (!ENABLED) {
		console.log("Dispatch simulation disabled (SIMULATION_ENABLED=false)");
		return;
	}

	console.log(`Dispatch simulation started (interval=${INTERVAL_MS}ms)`);

	setInterval(() => {
		runDispatchSimulationTick().catch((error) => {
			console.error("Dispatch simulation tick failed:", error);
		});
	}, INTERVAL_MS);
}
