import type { Context } from "hono";
import z from "zod";
import { RegisterSchema } from "./dto.js";
import { hash } from "./hash";
import { prisma } from "./prisma.server";

export async function register(c: Context) {
	const body = await c.req.json();

	const parsed = RegisterSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ errors: z.treeifyError(parsed.error) }, 400);
	}

	const { name, email, password, affiliation, role } = parsed.data;

	const exists = await prisma.user.findUnique({
		where: { email },
	});

	if (exists) {
		return c.json({ detail: "user already exists" }, 409);
	}

	const hashed = await hash(password);

	const user = await prisma.user.create({
		data: { name, email, role, affiliation },
	});

	await prisma.authCredential.create({
		data: {
			password: hashed,
			userId: user.id,
		},
	});

	return c.json({ user }, 201);
}
