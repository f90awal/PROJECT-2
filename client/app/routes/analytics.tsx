import type { LoaderFunctionArgs } from "react-router";
import { buildAnalyticsUrl } from "~/lib/analytics-proxy.server";
import { getBearerToken } from "~/lib/incident-proxy.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await getBearerToken(request);

	const response = await fetch(buildAnalyticsUrl(request), {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const data = await response.json();
	return Response.json(data, { status: response.status });
};
