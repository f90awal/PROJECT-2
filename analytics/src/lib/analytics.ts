import type { Context } from "hono";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma.server";

type Range = { from: Date; to: Date };

function parseRange(c: Context): Range | Response {
	const sp = new URL(c.req.url).searchParams;
	const now = new Date();
	const from = sp.get("from")
		? new Date(sp.get("from")!)
		: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const to = sp.get("to") ? new Date(sp.get("to")!) : now;

	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
		return c.json(
			{ detail: "from and to must be valid ISO date strings" },
			400,
		);
	if (from > to) return c.json({ detail: "from must be before to" }, 400);

	return { from, to };
}

function parseTop(c: Context, fallback = 5): number | Response {
	const raw = new URL(c.req.url).searchParams.get("top");
	if (!raw) return fallback;

	const parsed = Number.parseInt(raw, 10);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
		return c.json({ detail: "top must be an integer between 1 and 100" }, 400);
	}

	return parsed;
}

export async function responseTimes(c: Context) {
	const range = parseRange(c);
	if (range instanceof Response) return range;

	const rows = await prisma.$queryRaw<
		Array<{
			emergencyService: string;
			avgMinutes: number | null;
			p50Minutes: number | null;
			p95Minutes: number | null;
			total: bigint;
			arrived: bigint;
		}>
	>(Prisma.sql`
		SELECT
			"emergencyService",
			AVG(EXTRACT(EPOCH FROM ("arrivedAt" - "dispatchedAt")) / 60.0)        AS "avgMinutes",
			PERCENTILE_CONT(0.5) WITHIN GROUP (
				ORDER BY EXTRACT(EPOCH FROM ("arrivedAt" - "dispatchedAt")) / 60.0
			)                                                                       AS "p50Minutes",
			PERCENTILE_CONT(0.95) WITHIN GROUP (
				ORDER BY EXTRACT(EPOCH FROM ("arrivedAt" - "dispatchedAt")) / 60.0
			)                                                                       AS "p95Minutes",
			COUNT(*)::bigint                                                        AS "total",
			COUNT("arrivedAt")::bigint                                              AS "arrived"
		FROM "DispatchFact"
		WHERE "dispatchedAt" >= ${range.from}
			AND "dispatchedAt" <= ${range.to}
		GROUP BY "emergencyService"
		ORDER BY "emergencyService"
	`);

	const fmt = (n: number | null) => (n === null ? null : Number(n.toFixed(2)));

	let weightedSum = 0;
	let totalArrived = 0;
	for (const r of rows) {
		const count = Number(r.arrived);
		weightedSum += (r.avgMinutes ?? 0) * count;
		totalArrived += count;
	}

	return c.json({
		range,
		overall: {
			avgMinutes:
				totalArrived > 0
					? Number((weightedSum / totalArrived).toFixed(2))
					: null,
			totalDispatches: rows.reduce((s, r) => s + Number(r.total), 0),
			totalArrived,
		},
		byService: rows.map((r) => ({
			emergencyService: r.emergencyService,
			avgMinutes: fmt(r.avgMinutes),
			p50Minutes: fmt(r.p50Minutes),
			p95Minutes: fmt(r.p95Minutes),
			totalDispatches: Number(r.total),
			totalArrived: Number(r.arrived),
			arrivalRate:
				Number(r.total) > 0
					? Number(((Number(r.arrived) / Number(r.total)) * 100).toFixed(1))
					: null,
		})),
	});
}

export async function incidentsByRegion(c: Context) {
	const range = parseRange(c);
	if (range instanceof Response) return range;

	const grouped = await prisma.incidentFact.groupBy({
		by: ["region", "incidentType"],
		where: {
			createdAt: {
				gte: range.from,
				lte: range.to,
			},
		},
		_count: {
			_all: true,
		},
		orderBy: [{ region: "asc" }, { incidentType: "asc" }],
	});

	const totalIncidents = grouped.reduce(
		(sum, item) => sum + item._count._all,
		0,
	);

	return c.json({
		range,
		totalIncidents,
		breakdown: grouped.map((item) => ({
			region: item.region,
			incidentType: item.incidentType,
			count: item._count._all,
		})),
	});
}

export async function resourceUtilization(c: Context) {
	const range = parseRange(c);
	if (range instanceof Response) return range;

	const top = parseTop(c, 5);
	if (top instanceof Response) return top;

	const latestHospitalRows = await prisma.$queryRaw<
		Array<{
			hospitalId: string;
			hospitalName: string | null;
			region: string | null;
			totalBeds: number;
			availableBeds: number;
			capturedAt: Date;
		}>
	>(Prisma.sql`
		SELECT DISTINCT ON ("hospitalId")
			"hospitalId",
			"hospitalName",
			"region",
			"totalBeds",
			"availableBeds",
			"capturedAt"
		FROM "HospitalCapacityFact"
		WHERE "capturedAt" >= ${range.from}
			AND "capturedAt" <= ${range.to}
		ORDER BY "hospitalId", "capturedAt" DESC
	`);

	const totals = latestHospitalRows.reduce(
		(acc, item) => {
			acc.totalBeds += item.totalBeds;
			acc.availableBeds += item.availableBeds;
			return acc;
		},
		{ totalBeds: 0, availableBeds: 0 },
	);

	const responders = await prisma.dispatchFact.groupBy({
		by: ["emergencyService", "responderId", "responderName"],
		where: {
			dispatchedAt: {
				gte: range.from,
				lte: range.to,
			},
			responderId: { not: null },
		},
		_count: {
			dispatchId: true,
		},
		orderBy: {
			_count: {
				dispatchId: "desc",
			},
		},
	});

	const topRespondersByService: Record<
		string,
		Array<{
			responderId: string;
			responderName: string | null;
			deployments: number;
		}>
	> = {};

	for (const row of responders) {
		if (!row.responderId) continue;
		if (!topRespondersByService[row.emergencyService]) {
			topRespondersByService[row.emergencyService] = [];
		}

		if (topRespondersByService[row.emergencyService].length < top) {
			topRespondersByService[row.emergencyService].push({
				responderId: row.responderId,
				responderName: row.responderName,
				deployments: row._count.dispatchId ?? 0,
			});
		}
	}

	const usedBeds = totals.totalBeds - totals.availableBeds;
	const bedUsageRate =
		totals.totalBeds > 0
			? Number(((usedBeds / totals.totalBeds) * 100).toFixed(2))
			: null;

	return c.json({
		range,
		hospitalsConsidered: latestHospitalRows.length,
		bedUsage: {
			totalBeds: totals.totalBeds,
			availableBeds: totals.availableBeds,
			usedBeds,
			usageRatePercent: bedUsageRate,
		},
		topRespondersByService,
	});
}
