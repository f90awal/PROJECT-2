import { authCookie } from "./cookies.server";
import { unauthorized } from "./responses";
import type { User } from "./types";

export async function getUserProfile(
	request: Request,
): Promise<User | undefined> {
	const token = await authCookie.parse(request.headers.get("Cookie"));

	if (!token) {
		throw unauthorized();
	}

	const baseUrl = process.env.GATEWAY_BASE!;
	const response = await fetch(`${baseUrl}/auth/profile`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		throw unauthorized();
	}

	const data = await response.json();
	return data.user as User;
}
