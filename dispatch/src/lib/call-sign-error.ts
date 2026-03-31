import { Prisma } from "../generated/prisma/client";

export function isUniqueCallSignError(error: unknown) {
	if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
	if (error.code !== "P2002") return false;

	const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
	return targets.includes("callSign");
}
