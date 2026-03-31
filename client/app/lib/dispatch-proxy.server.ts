import { badRequest } from "~/lib/responses";

export function buildDispatchUrl(request: Request) {
	const url = new URL(request.url);
	const scope = url.searchParams.get("scope");

	if (scope === "vehicles") {
		return `${process.env.GATEWAY_BASE!}/dispatch/vehicles`;
	}

	if (scope === "dispatches-active") {
		return `${process.env.GATEWAY_BASE!}/dispatch/dispatches/active`;
	}

	if (scope === "stations") {
		return `${process.env.GATEWAY_BASE!}/dispatch/stations`;
	}

	if (scope === "tracking-live") {
		return `${process.env.GATEWAY_BASE!}/dispatch/tracking/live`;
	}

	throw badRequest({ detail: "invalid dispatch scope" });
}
