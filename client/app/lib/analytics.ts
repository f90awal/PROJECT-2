import type {
	IncidentsByRegionQuery,
	IncidentsByRegionResponse,
	ResourceUtilizationQuery,
	ResourceUtilizationResponse,
	ResponseTimesQuery,
	ResponseTimesResponse,
} from "~/lib/types/analytics/model";

type AnalyticsRangeQuery = {
	from?: string;
	to?: string;
	top?: number;
};

function toQueryString(query?: AnalyticsRangeQuery) {
	if (!query) return "";

	const search = new URLSearchParams();
	if (query.from) search.set("from", query.from);
	if (query.to) search.set("to", query.to);
	if (typeof query.top === "number" && Number.isFinite(query.top)) {
		search.set("top", String(query.top));
	}

	const qs = search.toString();
	return qs ? `&${qs}` : "";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const data = await response.json();

	if (!response.ok) {
		const message = data?.detail || "Request failed";
		throw new Error(message);
	}

	return data as T;
}

export async function fetchResponseTimes(
	query?: ResponseTimesQuery,
): Promise<ResponseTimesResponse> {
	const response = await fetch(
		`/analytics?scope=response-times${toQueryString(query)}`,
		{
			method: "GET",
			credentials: "include",
		},
	);

	return parseJsonResponse<ResponseTimesResponse>(response);
}

export async function fetchIncidentsByRegion(
	query?: IncidentsByRegionQuery,
): Promise<IncidentsByRegionResponse> {
	const response = await fetch(
		`/analytics?scope=incidents-by-region${toQueryString(query)}`,
		{
			method: "GET",
			credentials: "include",
		},
	);

	return parseJsonResponse<IncidentsByRegionResponse>(response);
}

export async function fetchResourceUtilization(
	query?: ResourceUtilizationQuery,
): Promise<ResourceUtilizationResponse> {
	const response = await fetch(
		`/analytics?scope=resource-utilization${toQueryString(query)}`,
		{
			method: "GET",
			credentials: "include",
		},
	);

	return parseJsonResponse<ResourceUtilizationResponse>(response);
}
