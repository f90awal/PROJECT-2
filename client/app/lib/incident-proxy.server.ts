import { authCookie } from "./cookies.server";
import { unauthorized } from "./responses";

export async function getBearerToken(request: Request) {
	const token = await authCookie.parse(request.headers.get("Cookie"));

	if (!token) throw unauthorized({ detail: "not authorized" });

	return token;
}

export function buildIncidentUrl(request: Request) {
	const url = new URL(request.url);
	const scope = url.searchParams.get("scope");

	if (scope === "open") {
		return `${process.env.GATEWAY_BASE!}/incident/open`;
	}

	const q = url.searchParams.toString();
	return `${process.env.GATEWAY_BASE!}/incident${q ? `?${q}` : ""}`;
}
