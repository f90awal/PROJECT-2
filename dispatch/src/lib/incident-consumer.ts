import Redis from "ioredis";
import { DispatchStatus, VehicleStatus } from "../generated/prisma/enums";
import { GROUP, STREAM } from "./consts";
import { clearIncidentTarget, setIncidentTarget } from "./incident-targets";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";
import { publishTrackingUpdate } from "./tracking-bus";
import { haversineDistanceKm, toMap } from "./utils";

type IncidentEventPayload = {
	incident?: {
		id?: string | number;
		status?: string;
		type?: {
			code?: string;
			category?: string;
		};
		location?: {
			center?: [number, number] | number[];
		};
	};
	id?: string | number;
	status?: string;
	type?: {
		code?: string;
		category?: string;
	};
	location?: {
		center?: [number, number] | number[];
	};
};

const redis = new Redis(process.env.REDIS_URL!);
const CONSUMER = `dispatch-${process.pid}`;
const DEBUG = process.env.SIM_DEBUG === "true";

function debugLog(event: string, payload: Record<string, unknown>) {
	if (!DEBUG) return;
	console.log(`[incident-consumer:${event}] ${JSON.stringify(payload)}`);
}

type StreamEntry = [entryId: string, fieldValues: string[]];
type StreamBatch = [streamName: string, entries: StreamEntry[]];

function toStringId(value: unknown): string | null {
	if (typeof value === "string" && value.length > 0) return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
}

function extractIncident(payload: IncidentEventPayload) {
	const incident = payload.incident ?? payload;
	const id = toStringId(incident.id);
	if (!id) return null;

	const center = incident.location?.center;
	if (
		Array.isArray(center) &&
		center.length >= 2 &&
		typeof center[0] === "number" &&
		typeof center[1] === "number" &&
		Number.isFinite(center[0]) &&
		Number.isFinite(center[1])
	) {
		// Incident center is stored as [lng, lat]
		return {
			id,
			lat: center[1],
			lng: center[0],
			typeCode:
				typeof incident.type?.code === "string"
					? incident.type.code.toUpperCase()
					: null,
			typeCategory:
				typeof incident.type?.category === "string"
					? incident.type.category.toLowerCase()
					: null,
		};
	}

	return null;
}

function preferredStationTypes(incident: {
	typeCode: string | null;
	typeCategory: string | null;
}) {
	if (incident.typeCode === "MEDICAL") return ["ambulance"] as const;
	if (incident.typeCode === "FIRE") return ["fire"] as const;
	if (incident.typeCode === "SECURITY") return ["police"] as const;

	if (incident.typeCode === "ACCIDENT") {
		return ["ambulance", "police"] as const;
	}

	if (incident.typeCode === "FLOOD") {
		return ["fire", "ambulance"] as const;
	}

	if (incident.typeCategory === "health") return ["ambulance"] as const;
	if (incident.typeCategory === "crime") return ["police"] as const;
	if (incident.typeCategory === "natural")
		return ["fire", "ambulance"] as const;

	return [] as const;
}

async function processIncidentCreated(rawPayload: string) {
	let payload: IncidentEventPayload;
	try {
		payload = JSON.parse(rawPayload) as IncidentEventPayload;
	} catch {
		return;
	}

	const incident = extractIncident(payload);
	if (!incident) return;

	debugLog("incident.parsed", {
		incidentId: incident.id,
		lat: incident.lat,
		lng: incident.lng,
	});

	setIncidentTarget(incident.id, incident.lat, incident.lng);

	const existingDispatch = await prisma.dispatch.findFirst({
		where: {
			incidentId: incident.id,
			status: { in: [DispatchStatus.active, DispatchStatus.arrived] },
		},
		select: { id: true },
	});
	if (existingDispatch) return;

	const candidates = await prisma.vehicle.findMany({
		where: { status: VehicleStatus.available },
		include: {
			driver: true,
			station: true,
			locations: {
				orderBy: { recordedAt: "desc" },
				take: 1,
			},
		},
	});

	const preferredTypes = preferredStationTypes(incident);
	const preferredTypeSet = new Set<string>(preferredTypes);
	const scopedCandidates = preferredTypes.length
		? candidates.filter((vehicle) => preferredTypeSet.has(vehicle.station.type))
		: candidates;
	const candidatePool = scopedCandidates.length ? scopedCandidates : candidates;

	const nearest = candidatePool
		.map((vehicle) => {
			const latest = vehicle.locations[0];
			if (!latest) return null;
			return {
				vehicle,
				distanceKm: haversineDistanceKm(
					incident.lat,
					incident.lng,
					latest.lat,
					latest.lng,
				),
			};
		})
		.filter(
			(
				entry,
			): entry is {
				vehicle: (typeof candidates)[number];
				distanceKm: number;
			} => entry !== null,
		)
		.sort((a, b) => a.distanceKm - b.distanceKm)[0];

	if (!nearest) return;

	debugLog("vehicle.selected", {
		incidentId: incident.id,
		incidentTypeCode: incident.typeCode,
		incidentTypeCategory: incident.typeCategory,
		preferredStationTypes: preferredTypes,
		vehicleId: nearest.vehicle.id,
		callSign: nearest.vehicle.callSign,
		stationType: nearest.vehicle.station.type,
		distanceKm: nearest.distanceKm,
	});

	const createdDispatch = await prisma.$transaction(async (tx) => {
		const dispatch = await tx.dispatch.create({
			data: {
				incidentId: incident.id,
				vehicleId: nearest.vehicle.id,
				status: DispatchStatus.active,
			},
		});

		await tx.vehicle.update({
			where: { id: nearest.vehicle.id },
			data: { status: VehicleStatus.dispatched },
		});

		await publishOutboxEvent(tx, {
			aggregateType: "dispatch",
			aggregateId: String(dispatch.id),
			eventType: "VehicleDispatched",
			payload: {
				dispatchId: dispatch.id,
				incidentId: dispatch.incidentId,
				vehicleId: dispatch.vehicleId,
				emergencyService: nearest.vehicle.station.type,
				responderId: nearest.vehicle.driver?.id ?? null,
				responderName: nearest.vehicle.driver?.name ?? null,
				region: nearest.vehicle.station.name,
				distanceKm: nearest.distanceKm,
				dispatchedAt: dispatch.dispatchedAt,
			},
		});

		return dispatch;
	});

	await publishTrackingUpdate({
		type: "dispatch.vehicle.dispatched",
		dispatchId: createdDispatch.id,
		incidentId: createdDispatch.incidentId,
		vehicleId: createdDispatch.vehicleId,
		vehicleStatus: VehicleStatus.dispatched,
		recordedAt: createdDispatch.dispatchedAt,
	});
}

function extractStatusUpdate(payload: IncidentEventPayload) {
	const incident = payload.incident ?? payload;
	const id = toStringId(incident.id);
	if (!id) return null;

	const status =
		typeof incident.status === "string" ? incident.status.toLowerCase() : null;

	if (status !== "resolved" && status !== "cancelled") return null;

	return {
		id,
		status,
	};
}

async function processIncidentStatusUpdated(rawPayload: string) {
	let payload: IncidentEventPayload;
	try {
		payload = JSON.parse(rawPayload) as IncidentEventPayload;
	} catch {
		return;
	}

	const update = extractStatusUpdate(payload);
	if (!update) return;

	const relatedDispatches = await prisma.dispatch.findMany({
		where: {
			incidentId: update.id,
			status: { in: [DispatchStatus.active, DispatchStatus.arrived] },
		},
		include: {
			vehicle: {
				include: {
					driver: true,
					station: true,
				},
			},
		},
	});

	if (!relatedDispatches.length) {
		debugLog("incident.resolved.no_dispatch", {
			incidentId: update.id,
			status: update.status,
		});
		return;
	}

	const now = new Date();

	await prisma.$transaction(async (tx) => {
		for (const dispatch of relatedDispatches) {
			await tx.dispatch.update({
				where: { id: dispatch.id },
				data: {
					status: DispatchStatus.cleared,
					clearedAt: dispatch.clearedAt ?? now,
				},
			});

			await tx.vehicle.update({
				where: { id: dispatch.vehicleId },
				data: { status: VehicleStatus.available },
			});

			await publishOutboxEvent(tx, {
				aggregateType: "dispatch",
				aggregateId: String(dispatch.id),
				eventType: "VehicleCleared",
				payload: {
					dispatchId: dispatch.id,
					incidentId: dispatch.incidentId,
					vehicleId: dispatch.vehicleId,
					emergencyService: dispatch.vehicle.station.type,
					responderId: dispatch.vehicle.driver?.id ?? null,
					responderName: dispatch.vehicle.driver?.name ?? null,
					region: dispatch.vehicle.station.name,
					clearedAt: now,
					reason: update.status,
				},
			});
		}
	});

	for (const dispatch of relatedDispatches) {
		await publishTrackingUpdate({
			type: "dispatch.vehicle.cleared",
			dispatchId: dispatch.id,
			incidentId: dispatch.incidentId,
			vehicleId: dispatch.vehicleId,
			vehicleStatus: VehicleStatus.available,
			recordedAt: now.toISOString(),
		});
	}

	clearIncidentTarget(update.id);

	debugLog("incident.resolved.cleared", {
		incidentId: update.id,
		status: update.status,
		dispatchCount: relatedDispatches.length,
	});
}

async function ensureGroup() {
	try {
		await redis.xgroup("CREATE", STREAM, GROUP, "$", "MKSTREAM");
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"message" in error &&
			typeof error.message === "string" &&
			error.message.includes("BUSYGROUP")
		) {
			return;
		}
		throw error;
	}
}

let running = false;

async function loop() {
	while (running) {
		try {
			const records = (await redis.xreadgroup(
				"GROUP",
				GROUP,
				CONSUMER,
				"COUNT",
				"20",
				"BLOCK",
				"2000",
				"STREAMS",
				STREAM,
				">",
			)) as StreamBatch[] | null;

			if (!records?.length) continue;

			for (const [, entries] of records) {
				for (const [entryId, fieldValues] of entries) {
					const map = toMap(fieldValues);
					console.log(
						`[stream:consume] service=dispatch stream=${STREAM} group=${GROUP} consumer=${CONSUMER} entryId=${entryId} eventType=${map.eventType ?? "unknown"}`,
					);
					try {
						if (map.eventType === "IncidentCreated" && map.payload) {
							await processIncidentCreated(map.payload);
							console.log(
								`[stream:processed] service=dispatch stream=${STREAM} entryId=${entryId} eventType=${map.eventType}`,
							);
						}

						if (map.eventType === "IncidentStatusUpdated" && map.payload) {
							await processIncidentStatusUpdated(map.payload);
							console.log(
								`[stream:processed] service=dispatch stream=${STREAM} entryId=${entryId} eventType=${map.eventType}`,
							);
						}
						await redis.xack(STREAM, GROUP, entryId);
						console.log(
							`[stream:ack] service=dispatch stream=${STREAM} group=${GROUP} entryId=${entryId}`,
						);
					} catch (error) {
						console.error("Failed handling stream event:", error);
					}
				}
			}
		} catch (error) {
			console.error("Dispatch consumer loop error:", error);
		}
	}
}

export async function startIncidentConsumer() {
	if (running) return;
	await ensureGroup();
	running = true;
	void loop();
	console.log(
		`Incident stream consumer running: stream=${STREAM}, group=${GROUP}`,
	);
}

export async function stopIncidentConsumer() {
	running = false;
	await redis.quit();
}
