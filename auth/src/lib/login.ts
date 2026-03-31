import type { Context } from "hono";
import { sign } from "hono/jwt";
import { treeifyError } from "zod";
import { LoginSchema } from "./dto";
import { match } from "./hash";
import { prisma } from "./prisma.server";

export async function login(c: Context) {
	const body = await c.req.json();

	const parsed = LoginSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ errors: treeifyError(parsed.error) }, 400);
	}

	const { email, password } = parsed.data;

	const user = await prisma.user.findUnique({
		where: { email },
		include: { authCredential: true },
	});

	if (!user?.authCredential) {
		return c.json({ detail: "Invalid email or password" }, 401);
	}

	const valid = await match(password, user.authCredential.password);
	if (!valid) {
		return c.json({ detail: "Invalid email or password" }, 401);
	}

	await prisma.user.update({
		where: { id: user.id },
		data: { lastLogin: new Date() },
	});

	// strip credentials from response
	// eslint-disable-next-line @typescript-eslint/no-unused-vars

	const now = Math.floor(Date.now() / 1000);

	const token = await sign(
		{
			sub: String(user.id),
			role: user.role,
			name: user.name,
			iat: now,
			exp: now + 14 * 24 * 60 * 60, // 14 days
		},
		process.env.JWT_PRIVATE_KEY!,
		"RS256",
	);

	return c.json({ token }, 200);
}
