import Redis from "ioredis";
import { EmergencyService } from "../generated/prisma/enums";
import {
	DISPATCH_GROUP,
	DISPATCH_STREAM,
	INCIDENT_GROUP,
	INCIDENT_STREAM,
} from "./consts";
import { prisma } from "./prisma.server";

type Json = Record<string, unknown>;
type StreamEntry = [entryId: string, fieldValues: string[]];
type StreamBatch = [streamName: string, entries: StreamEntry[]];

type IncidentCreatedPayload = {
	incident?: {
		id?: number | string;
		type?: { code?: string } | string;
		location?: { address?: string };
		status?: string;
		createdAt?: string;
		dispatchedAt?: string;
		resolvedAt?: string;
		metadata?: Json;
	};
};

type IncidentStatusPayload = {
	id?: number | string;
	status?: string;
};

type VehicleDispatchedPayload = {
	dispatchId?: number | string;
	incidentId?: number | string;
	dispatchedAt?: string;
	emergencyService?: string;
	responderId?: number | string | null;
	responderName?: string | null;
	region?: string | null;
};

type VehicleArrivedPayload = {
	dispatchId?: number | string;
	arrivedAt?: string;
};

type HospitalCapacityPayload = {
	hospitalId?: number | string;
	hospitalName?: string | null;
	region?: string | null;
	totalBeds?: number;
	availableBeds?: number;
	totalAmbulances?: number | null;
	availableAmbulances?: number | null;
	capturedAt?: string;
};

const redis = new Redis(process.env.REDIS_URL!);
const INCIDENT_CONSUMER = `analytics-inc-${process.pid}`;
const DISPATCH_CONSUMER = `analytics-dis-${process.pid}`;

function toMap(fields: string[]) {
	const out: Record<string, string> = {};
	for (let i = 0; i < fields.length; i += 2) {
		out[fields[i]] = fields[i + 1] ?? "";
	}
	return out;
}

function parsePayload(raw: string): Json | null {
	try {
		return JSON.parse(raw) as Json;
	} catch {
		return null;
	}
}

function toDate(value: unknown): Date | null {
	if (typeof value !== "string") return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStringId(value: unknown): string | null {
	if (typeof value === "string" && value.length > 0) return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
}

function extractIncidentType(type: unknown): string {
	if (typeof type === "string") return type;
	if (type && typeof type === "object" && "code" in type) {
		const code = (type as { code?: unknown }).code;
		if (typeof code === "string" && code.length > 0) return code;
	}
	return "unknown";
}

function extractRegionFromAddress(address: unknown): string {
	if (typeof address !== "string") return "unknown";
	const pieces = address
		.split(",")
		.map((piece) => piece.trim())
		.filter(Boolean);
	if (!pieces.length) return "unknown";
	return pieces[pieces.length - 1];
}

function parseEmergencyService(value: unknown): EmergencyService {
	if (value === EmergencyService.ambulance) return EmergencyService.ambulance;
	if (value === EmergencyService.fire) return EmergencyService.fire;
	if (value === EmergencyService.police) return EmergencyService.police;
	return EmergencyService.ambulance;
}

async function processIncidentEvent(eventType: string, payload: Json) {
	if (eventType === "IncidentCreated") {
		const data = payload as IncidentCreatedPayload;
		const incident = data.incident;
		if (!incident) return;

		const incidentId = toStringId(incident.id);
		if (!incidentId) return;

		await prisma.incidentFact.upsert({
			where: { incidentId },
			update: {
				region: extractRegionFromAddress(incident.location?.address),
				incidentType: extractIncidentType(incident.type),
				status: typeof incident.status === "string" ? incident.status : null,
				createdAt: toDate(incident.createdAt) ?? new Date(),
				dispatchedAt: toDate(incident.dispatchedAt),
				resolvedAt: toDate(incident.resolvedAt),
				metadata: (incident.metadata as object | null | undefined) ?? undefined,
				ingestedAt: new Date(),
			},
			create: {
				incidentId,
				region: extractRegionFromAddress(incident.location?.address),
				incidentType: extractIncidentType(incident.type),
				status:
					typeof incident.status === "string" ? incident.status : "created",
				createdAt: toDate(incident.createdAt) ?? new Date(),
				dispatchedAt: toDate(incident.dispatchedAt),
				resolvedAt: toDate(incident.resolvedAt),
				metadata: (incident.metadata as object | null | undefined) ?? undefined,
			},
		});
		return;
	}

	if (eventType === "IncidentStatusUpdated") {
		const data = payload as IncidentStatusPayload;
		const incidentId = toStringId(data.id);
		if (!incidentId || typeof data.status !== "string") return;

		const now = new Date();
		await prisma.incidentFact.updateMany({
			where: { incidentId },
			data: {
				status: data.status,
				dispatchedAt: data.status === "dispatched" ? now : undefined,
				resolvedAt: data.status === "resolved" ? now : undefined,
				ingestedAt: now,
			},
		});
	}
}

async function processDispatchEvent(eventType: string, payload: Json) {
	if (eventType === "VehicleDispatched") {
		const data = payload as VehicleDispatchedPayload;
		const dispatchId = toStringId(data.dispatchId);
		const incidentId = toStringId(data.incidentId);
		if (!dispatchId || !incidentId) return;

		await prisma.dispatchFact.upsert({
			where: { dispatchId },
			update: {
				incidentId,
				emergencyService: parseEmergencyService(data.emergencyService),
				responderId: toStringId(data.responderId),
				responderName:
					typeof data.responderName === "string" ? data.responderName : null,
				region: typeof data.region === "string" ? data.region : null,
				dispatchedAt: toDate(data.dispatchedAt) ?? new Date(),
				ingestedAt: new Date(),
			},
			create: {
				dispatchId,
				incidentId,
				emergencyService: parseEmergencyService(data.emergencyService),
				responderId: toStringId(data.responderId),
				responderName:
					typeof data.responderName === "string" ? data.responderName : null,
				region: typeof data.region === "string" ? data.region : null,
				dispatchedAt: toDate(data.dispatchedAt) ?? new Date(),
			},
		});
		return;
	}

	if (eventType === "VehicleArrived") {
		const data = payload as VehicleArrivedPayload;
		const dispatchId = toStringId(data.dispatchId);
		if (!dispatchId) return;

		await prisma.dispatchFact.updateMany({
			where: { dispatchId },
			data: {
				arrivedAt: toDate(data.arrivedAt) ?? new Date(),
				ingestedAt: new Date(),
			},
		});
		return;
	}

	if (eventType === "HospitalCapacityUpdated") {
		const data = payload as HospitalCapacityPayload;
		const hospitalId = toStringId(data.hospitalId);
		if (!hospitalId) return;

		await prisma.hospitalCapacityFact.create({
			data: {
				hospitalId,
				hospitalName:
					typeof data.hospitalName === "string" ? data.hospitalName : null,
				region: typeof data.region === "string" ? data.region : null,
				totalBeds:
					typeof data.totalBeds === "number" && Number.isFinite(data.totalBeds)
						? Math.trunc(data.totalBeds)
						: 0,
				availableBeds:
					typeof data.availableBeds === "number" &&
					Number.isFinite(data.availableBeds)
						? Math.trunc(data.availableBeds)
						: 0,
				totalAmbulances:
					typeof data.totalAmbulances === "number" &&
					Number.isFinite(data.totalAmbulances)
						? Math.trunc(data.totalAmbulances)
						: null,
				availableAmbulances:
					typeof data.availableAmbulances === "number" &&
					Number.isFinite(data.availableAmbulances)
						? Math.trunc(data.availableAmbulances)
						: null,
				capturedAt: toDate(data.capturedAt) ?? new Date(),
			},
		});
	}
}

async function ensureGroup(stream: string, group: string) {
	try {
		await redis.xgroup("CREATE", stream, group, "$", "MKSTREAM");
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

async function consume(
	stream: string,
	group: string,
	consumer: string,
	handler: (eventType: string, payload: Json) => Promise<void>,
) {
	while (running) {
		try {
			const records = (await redis.xreadgroup(
				"GROUP",
				group,
				consumer,
				"COUNT",
				"20",
				"BLOCK",
				"2000",
				"STREAMS",
				stream,
				">",
			)) as StreamBatch[] | null;

			if (!records?.length) continue;

			for (const [, entries] of records) {
				for (const [entryId, fieldValues] of entries) {
					const map = toMap(fieldValues);
					const eventType = map.eventType;
					const payload = map.payload ? parsePayload(map.payload) : null;

					console.log(
						`[stream:consume] service=analytics stream=${stream} group=${group} consumer=${consumer} entryId=${entryId} eventType=${eventType ?? "unknown"}`,
					);

					try {
						if (eventType && payload) {
							await handler(eventType, payload);
							console.log(
								`[stream:processed] service=analytics stream=${stream} entryId=${entryId} eventType=${eventType}`,
							);
						}
						await redis.xack(stream, group, entryId);
						console.log(
							`[stream:ack] service=analytics stream=${stream} group=${group} entryId=${entryId}`,
						);
					} catch (error) {
						console.error(`Analytics consumer failed for ${stream}:`, error);
					}
				}
			}
		} catch (error) {
			console.error(`Analytics consumer loop error for ${stream}:`, error);
		}
	}
}

export async function startAnalyticsConsumer() {
	if (running) return;

	await ensureGroup(INCIDENT_STREAM, INCIDENT_GROUP);
	await ensureGroup(DISPATCH_STREAM, DISPATCH_GROUP);

	running = true;

	void consume(
		INCIDENT_STREAM,
		INCIDENT_GROUP,
		INCIDENT_CONSUMER,
		processIncidentEvent,
	);
	void consume(
		DISPATCH_STREAM,
		DISPATCH_GROUP,
		DISPATCH_CONSUMER,
		processDispatchEvent,
	);

	console.log(
		`Analytics consumer running: streams=${INCIDENT_STREAM},${DISPATCH_STREAM}`,
	);
}

export async function stopAnalyticsConsumer() {
	running = false;
	await redis.quit();
}
