import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { buildIncidentUrl, getBearerToken } from "~/lib/incident-proxy.server";
import { methodNotAllowed } from "~/lib/responses";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await getBearerToken(request);

	const response = await fetch(buildIncidentUrl(request), {
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
	const payload = await request.json();

	let response: Response;

	if (request.method === "POST") {
		response = await fetch(`${process.env.GATEWAY_BASE!}/incident`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payload),
		});
	} else if (request.method === "PUT") {
		const id = Number(payload?.id);

		if (!Number.isFinite(id)) {
			return Response.json({ detail: "invalid id" }, { status: 400 });
		}

		response = await fetch(
			`${process.env.GATEWAY_BASE!}/incident/${id}/status`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ status: payload?.status }),
			},
		);
	} else {
		throw methodNotAllowed();
	}

	const data = await response.json();
	return Response.json(data, { status: response.status });
};
