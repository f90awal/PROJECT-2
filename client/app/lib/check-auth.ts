import * as jose from "jose";
import { authCookie } from "./cookies.server";
import { unauthorized } from "./responses";

export type JwtUser = {
	sub: string;
	name: string;
	role: string;
};

export async function checkAuth(
	request: Request,
): Promise<JwtUser | undefined> {
	const token = await authCookie.parse(request.headers.get("Cookie"));

	if (!token) throw unauthorized();

	try {
		const publicKey = await jose.importSPKI(
			process.env.JWT_PUBLIC_KEY!,
			"RS256",
		);
		const { payload } = await jose.jwtVerify(token, publicKey);
		return payload as JwtUser;
	} catch (_) {
		throw unauthorized();
	}
}
