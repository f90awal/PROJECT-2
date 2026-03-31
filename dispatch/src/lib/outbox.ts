import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { OutboxStatus } from "../generated/prisma/enums";
import { OUTBOX_TOPIC } from "./consts";
import { prisma } from "./prisma.server";

type DbClient = PrismaClient | Prisma.TransactionClient;
const LOCK_WINDOW_MS = 30_000;

export async function publishOutboxEvent(
	db: DbClient,
	params: {
		aggregateType: string;
		aggregateId: string;
		eventType: string;
		payload: object;
		topic?: string;
	},
) {
	return db.outbox.create({
		data: {
			aggregateType: params.aggregateType,
			aggregateId: params.aggregateId,
			eventType: params.eventType,
			topic: params.topic ?? OUTBOX_TOPIC,
			payload: params.payload,
		},
	});
}

export async function claimPendingOutbox(limit = 20) {
	const now = new Date();
	const lockUntil = new Date(now.getTime() + LOCK_WINDOW_MS);

	return prisma.$transaction(async (tx) => {
		const rows = await tx.outbox.findMany({
			where: {
				status: OutboxStatus.pending,
				OR: [{ nextAttempt: null }, { nextAttempt: { lte: now } }],
			},
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
			status: OutboxStatus.published,
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
			status: OutboxStatus.pending,
			nextAttempt: retryAt,
		},
	});
}
