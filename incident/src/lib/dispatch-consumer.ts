import Redis from "ioredis";
import { publishEvent } from "./outbox";
import { prisma } from "./prisma.server";

type StreamEntry = [entryId: string, fieldValues: string[]];
type StreamBatch = [streamName: string, entries: StreamEntry[]];

type DispatchEventPayload = {
	incidentId?: string | number;
	dispatchId?: number;
	vehicleId?: number;
};

const STREAM = "dispatch.events";
const GROUP = "incident-group";
const CONSUMER = `incident-${process.pid}`;

const redis = new Redis(process.env.REDIS_URL!);

function toMap(fieldValues: string[]) {
	const map: Record<string, string> = {};
	for (let i = 0; i < fieldValues.length; i += 2) {
		const key = fieldValues[i];
		const value = fieldValues[i + 1];
		if (typeof key === "string" && typeof value === "string") {
			map[key] = value;
		}
	}
	return map;
}

function toIncidentId(value: unknown) {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isInteger(parsed) && parsed > 0) return parsed;
	}

	return null;
}

function statusFromEvent(eventType: string) {
	if (eventType === "VehicleDispatched") return "dispatched" as const;
	if (eventType === "VehicleArrived") return "in_progress" as const;
	return null;
}

async function processDispatchEvent(eventType: string, rawPayload: string) {
	const nextStatus = statusFromEvent(eventType);
	if (!nextStatus) return;

	let payload: DispatchEventPayload;
	try {
		payload = JSON.parse(rawPayload) as DispatchEventPayload;
	} catch {
		return;
	}

	const incidentId = toIncidentId(payload.incidentId);
	if (!incidentId) return;

	const incident = await prisma.incident.findUnique({
		where: { id: incidentId },
	});
	if (!incident) return;

	if (incident.status === "resolved" || incident.status === "cancelled") {
		return;
	}

	if (
		nextStatus === "dispatched" &&
		(incident.status === "dispatched" || incident.status === "in_progress")
	) {
		return;
	}

	if (nextStatus === "in_progress" && incident.status === "in_progress") {
		return;
	}

	const now = new Date();
	const updated = await prisma.incident.update({
		where: { id: incidentId },
		data: {
			status: nextStatus,
			dispatchedAt:
				incident.dispatchedAt ??
				(nextStatus === "dispatched" || nextStatus === "in_progress"
					? now
					: null),
			version: { increment: 1 },
		},
	});

	await publishEvent({
		aggregateId: updated.id,
		topic: "incident.status.updated",
		eventType: "IncidentStatusUpdated",
		payload: {
			id: updated.id,
			status: updated.status,
			sourceEvent: eventType,
			dispatchId: payload.dispatchId ?? null,
			vehicleId: payload.vehicleId ?? null,
		},
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
					try {
						if (map.eventType && map.payload) {
							await processDispatchEvent(map.eventType, map.payload);
						}
						await redis.xack(STREAM, GROUP, entryId);
					} catch (error) {
						console.error("Incident dispatch-consumer event failed:", error);
					}
				}
			}
		} catch (error) {
			console.error("Incident dispatch-consumer loop error:", error);
		}
	}
}

export async function startDispatchConsumer() {
	if (running) return;
	await ensureGroup();
	running = true;
	void loop();
	console.log(
		`Dispatch stream consumer running: stream=${STREAM}, group=${GROUP}`,
	);
}

export async function stopDispatchConsumer() {
	running = false;
	await redis.quit();
}
