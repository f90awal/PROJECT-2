import type { Context } from "hono";
import z from "zod";
import { UpdateProfileSchema } from "./dto";
import { prisma } from "./prisma.server";
import type { JwtUser } from "./types";

async function getProfile(c: Context) {
	const claims = c.get("user") as JwtUser | undefined;

	if (!claims) {
		return c.json({ detail: "not authorized" }, 401);
	}

	const userId = Number(claims.sub);

	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		return c.json({ detail: "User not found" }, 404);
	}

	return c.json({ user }, 200);
}

async function updateProfile(c: Context) {
	const claims = c.get("user") as JwtUser | undefined;

	if (!claims) {
		return c.json({ detail: "not authorized" }, 401);
	}

	const body = await c.req.json();

	if (body?.email !== undefined) {
		return c.json({ detail: "email cannot be updated" }, 400);
	}

	const parsed = UpdateProfileSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ errors: z.treeifyError(parsed.error) }, 400);
	}

	if (parsed.data.affiliation !== undefined && claims.role !== "super") {
		return c.json({ detail: "forbidden" }, 403);
	}

	const userId = Number(claims.sub);
	const data = parsed.data;

	const user = await prisma.user.update({
		where: { id: userId },
		data,
	});

	return c.json({ user }, 200);
}

export { getProfile, updateProfile };
