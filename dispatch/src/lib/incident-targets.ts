type IncidentTarget = {
	lat: number;
	lng: number;
	updatedAt: number;
};

const targets = new Map<string, IncidentTarget>();
const TTL_MS = 60 * 60 * 1000;
const hydrateInFlight = new Map<string, Promise<IncidentTarget | null>>();
const retryAfter = new Map<string, number>();
const RETRY_COOLDOWN_MS = 15_000;
const DEBUG = process.env.SIM_DEBUG === "true";

type IncidentResponse = {
	id?: string | number;
	location?: {
		center?: [number, number] | number[];
	};
};

const INCIDENT_SERVICE_URL =
	process.env.INCIDENT_SERVICE_URL ?? "http://localhost:4001/api/incident";

function debugLog(event: string, payload: Record<string, unknown>) {
	if (!DEBUG) return;
	console.log(`[incident-targets:${event}] ${JSON.stringify(payload)}`);
}

export function setIncidentTarget(
	incidentId: string,
	lat: number,
	lng: number,
) {
	targets.set(incidentId, {
		lat,
		lng,
		updatedAt: Date.now(),
	});
	retryAfter.delete(incidentId);
}

export function getIncidentTarget(incidentId: string) {
	const item = targets.get(incidentId);
	if (!item) return null;

	if (Date.now() - item.updatedAt > TTL_MS) {
		targets.delete(incidentId);
		return null;
	}

	return item;
}

function extractCenter(payload: IncidentResponse) {
	const center = payload.location?.center;
	if (
		Array.isArray(center) &&
		center.length >= 2 &&
		typeof center[0] === "number" &&
		typeof center[1] === "number" &&
		Number.isFinite(center[0]) &&
		Number.isFinite(center[1])
	) {
		// Incident center is [lng, lat]
		return { lat: center[1], lng: center[0] };
	}

	return null;
}

async function fetchIncidentTarget(incidentId: string) {
	const now = Date.now();
	const nextTry = retryAfter.get(incidentId) ?? 0;
	if (nextTry > now) {
		debugLog("hydrate.cooldown", {
			incidentId,
			nextTryAt: new Date(nextTry).toISOString(),
		});
		return null;
	}

	const response = await fetch(`${INCIDENT_SERVICE_URL}/${incidentId}`, {
		method: "GET",
	});

	if (!response.ok) {
		let detail = "";
		try {
			detail = await response.text();
		} catch {
			// ignore text parse errors
		}

		debugLog("hydrate.fetch_failed", {
			incidentId,
			url: `${INCIDENT_SERVICE_URL}/${incidentId}`,
			status: response.status,
			detail,
		});

		retryAfter.set(incidentId, now + RETRY_COOLDOWN_MS);
		return null;
	}

	const payload = (await response.json()) as IncidentResponse;
	const center = extractCenter(payload);
	if (!center) {
		debugLog("hydrate.invalid_payload", {
			incidentId,
			payload,
		});

		retryAfter.set(incidentId, now + RETRY_COOLDOWN_MS);
		return null;
	}

	debugLog("hydrate.success", {
		incidentId,
		lat: center.lat,
		lng: center.lng,
	});

	setIncidentTarget(incidentId, center.lat, center.lng);
	return getIncidentTarget(incidentId);
}

export async function getOrHydrateIncidentTarget(incidentId: string) {
	const existing = getIncidentTarget(incidentId);
	if (existing) {
		debugLog("cache.hit", {
			incidentId,
			lat: existing.lat,
			lng: existing.lng,
		});
		return existing;
	}

	const running = hydrateInFlight.get(incidentId);
	if (running) return running;

	const pending = fetchIncidentTarget(incidentId)
		.catch(() => null)
		.finally(() => {
			hydrateInFlight.delete(incidentId);
		});

	hydrateInFlight.set(incidentId, pending);
	return pending;
}

export function clearIncidentTarget(incidentId: string) {
	targets.delete(incidentId);
	retryAfter.delete(incidentId);
}

export function pruneIncidentTargets() {
	const now = Date.now();
	for (const [key, value] of targets.entries()) {
		if (now - value.updatedAt > TTL_MS) {
			targets.delete(key);
		}
	}

	for (const [key, value] of retryAfter.entries()) {
		if (value <= now) {
			retryAfter.delete(key);
		}
	}
}
