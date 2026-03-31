import type { Prisma } from "../generated/prisma/browser";
import { prisma } from "./prisma.server";

const LOCK_WINDOW_MS = 30_000;

const pending: Prisma.OutboxWhereInput = {
	status: "pending",
	OR: [{ nextAttempt: null }, { nextAttempt: { lte: new Date() } }],
};

export async function claimPendingOutbox(limit = 20) {
	const now = new Date();
	const lockUntil = new Date(now.getTime() + LOCK_WINDOW_MS);

	return prisma.$transaction(async (tx) => {
		const rows = await tx.outbox.findMany({
			where: pending,
			orderBy: [{ createdAt: "asc" }],
			take: limit,
		});

		if (!rows.length) return [];

		await Promise.all(
			rows.map((row) =>
				tx.outbox.update({
					where: { id: row.id },
					data: {
						attempts: { increment: 1 },
						nextAttempt: lockUntil,
					},
				}),
			),
		);

		return rows.map((row) => ({
			...row,
			attempts: row.attempts + 1,
			nextAttempt: lockUntil,
		}));
	});
}

export function markOutboxPublished(id: number) {
	return prisma.outbox.update({
		where: { id },
		data: {
			status: "published",
			publishedAt: new Date(),
			nextAttempt: null,
		},
	});
}

export function markOutboxFailed(id: number, backoffMs = 60_000) {
	const retryAt = new Date(Date.now() + backoffMs);

	return prisma.outbox.update({
		where: { id },
		data: {
			status: "pending",
			nextAttempt: retryAt,
		},
	});
}

export async function publishEvent(
	event: Omit<Prisma.OutboxCreateInput, "aggregateType">,
) {
	return prisma.outbox.create({
		data: {
			aggregateType: "Incident",
			...event,
		},
	});
}
