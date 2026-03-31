import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { buildDispatchUrl } from "~/lib/dispatch-proxy.server";
import { getBearerToken } from "~/lib/incident-proxy.server";
import { badRequest, methodNotAllowed } from "~/lib/responses";

function isExpectedStreamClose(error: unknown) {
	if (!error || typeof error !== "object") return false;

	if (
		"name" in error &&
		typeof error.name === "string" &&
		error.name === "AbortError"
	) {
		return true;
	}

	if ("message" in error && typeof error.message === "string") {
		const message = error.message.toLowerCase();
		if (message.includes("terminated") || message.includes("socket"))
			return true;
	}

	return false;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await getBearerToken(request);
	const target = buildDispatchUrl(request);
	const scope = new URL(request.url).searchParams.get("scope");

	if (scope === "tracking-live") {
		try {
			const response = await fetch(target, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				signal: request.signal,
			});

			const headers = new Headers();
			headers.set(
				"Content-Type",
				response.headers.get("Content-Type") ?? "text/event-stream",
			);
			headers.set("Cache-Control", "no-cache");
			headers.set("Connection", "keep-alive");

			return new Response(response.body, {
				status: response.status,
				headers,
			});
		} catch (error) {
			if (request.signal.aborted || isExpectedStreamClose(error)) {
				// Browser EventSource reconnects automatically after a closed stream.
				return new Response(null, { status: 200 });
			}
			throw error;
		}
	}

	const response = await fetch(target, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();
	return Response.json(data, { status: response.status });
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await getBearerToken(request);
	const body = await request.json();
	const action = body?.action;
	const payload = body?.payload;

	let response: Response;

	if (request.method === "POST") {
		if (action === "station-register") {
			response = await fetch(
				`${process.env.GATEWAY_BASE!}/dispatch/stations/register`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			);
		} else if (action === "stations-seed") {
			response = await fetch(
				`${process.env.GATEWAY_BASE!}/dispatch/stations/seed`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload ?? {}),
				},
			);
		} else if (action === "vehicle-register") {
			response = await fetch(
				`${process.env.GATEWAY_BASE!}/dispatch/vehicles/register`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			);
		} else if (action === "driver-register") {
			response = await fetch(
				`${process.env.GATEWAY_BASE!}/dispatch/drivers/register`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			);
		} else if (action === "vehicle-location") {
			const id = Number(payload?.id);
			if (!Number.isFinite(id)) {
				throw badRequest({ detail: "invalid vehicle id" });
			}

			response = await fetch(
				`${process.env.GATEWAY_BASE!}/dispatch/vehicles/${id}/location`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						lat: payload?.lat,
						lng: payload?.lng,
						speed: payload?.speed,
						heading: payload?.heading,
						recordedAt: payload?.recordedAt,
					}),
				},
			);
		} else {
			throw badRequest({ detail: "invalid dispatch action" });
		}
	} else if (request.method === "PUT") {
		if (action !== "dispatch-arrive") {
			throw badRequest({ detail: "invalid dispatch action" });
		}

		const id = Number(payload?.id);
		if (!Number.isFinite(id)) {
			throw badRequest({ detail: "invalid dispatch id" });
		}

		response = await fetch(
			`${process.env.GATEWAY_BASE!}/dispatch/dispatches/${id}/arrive`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);
	} else {
		throw methodNotAllowed();
	}

	const data = await response.json();
	return Response.json(data, { status: response.status });
};
