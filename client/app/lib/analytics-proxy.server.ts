import { badRequest } from "~/lib/responses";

export function buildAnalyticsUrl(request: Request) {
	const url = new URL(request.url);
	const scope = url.searchParams.get("scope");

	const from = url.searchParams.get("from");
	const to = url.searchParams.get("to");
	const top = url.searchParams.get("top");
	const qs = new URLSearchParams();
	if (from) qs.set("from", from);
	if (to) qs.set("to", to);
	if (top) qs.set("top", top);

	const query = qs.toString();
	const suffix = query ? `?${query}` : "";

	if (scope === "response-times") {
		return `${process.env.GATEWAY_BASE!}/analytics/response-times${suffix}`;
	}

	if (scope === "incidents-by-region") {
		return `${process.env.GATEWAY_BASE!}/analytics/incidents-by-region${suffix}`;
	}

	if (scope === "resource-utilization") {
		return `${process.env.GATEWAY_BASE!}/analytics/resource-utilization${suffix}`;
	}

	throw badRequest({ detail: "invalid analytics scope" });
}
