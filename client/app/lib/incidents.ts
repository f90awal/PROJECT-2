import type {
	CreateIncidentPayload,
	Incident,
	IncidentListResponse,
	ListIncidentsQuery,
	UpdateIncidentStatusPayload,
} from "~/lib/types";

function toQueryString(params?: Partial<ListIncidentsQuery>) {
	if (!params) return "";

	const search = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		search.set(key, String(value));
	}

	const qs = search.toString();
	return qs ? `?${qs}` : "";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const data = await response.json();

	if (!response.ok) {
		const message = data?.detail || "Request failed";
		throw new Error(message);
	}

	return data as T;
}

export async function fetchIncidents(
	query?: Partial<ListIncidentsQuery>,
): Promise<IncidentListResponse> {
	const response = await fetch(`/incident${toQueryString(query)}`, {
		method: "GET",
		credentials: "include",
	});

	return parseJsonResponse<IncidentListResponse>(response);
}

export async function createIncident(
	payload: CreateIncidentPayload,
): Promise<Incident> {
	const response = await fetch("/incident", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(payload),
	});

	return parseJsonResponse<Incident>(response);
}

type ResolveIncidentPayload = {
	id: number;
	status: UpdateIncidentStatusPayload["status"];
};

export async function resolveIncidentStatus(
	payload: ResolveIncidentPayload,
): Promise<Incident> {
	const response = await fetch("/incident", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(payload),
	});

	return parseJsonResponse<Incident>(response);
}
