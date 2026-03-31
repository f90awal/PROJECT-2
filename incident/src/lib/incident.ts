import type { Context } from "hono";
import type { Prisma, Status } from "../generated/prisma/browser";
import type { IncidentUpdateInput } from "../generated/prisma/models";
import { AssignSchema, CreateIncidentSchema, UpdateStatusSchema } from "./dto";
import { parse } from "./http";
import { publishEvent } from "./outbox";
import { prisma } from "./prisma.server";

async function create(c: Context) {
	const { type, description, location, priority, metadata } = await parse(
		c,
		CreateIncidentSchema,
	);
	const reporterId = c.req.header("x-user-id") ?? null;

	const incident = await prisma.incident.create({
		data: { type, description, location, priority, metadata, reporterId },
	});

	await publishEvent({
		aggregateId: incident.id,
		topic: "incident.created",
		eventType: "IncidentCreated",
		payload: { incident },
	});

	return c.json(incident, 201);
}

async function get(c: Context) {
	const idStr = c.req.param("id");
	if (!idStr) return c.json({ detail: "missing id" }, 400);

	const id = parseInt(idStr, 10);
	if (Number.isNaN(id)) return c.json({ detail: "invalid id" }, 400);

	const incident = await prisma.incident.findUnique({ where: { id } });
	
	if (!incident) return c.json({ detail: "not found" }, 404);

	return c.json(incident, 200);
}

async function listIncidents(c: Context) {
	const sp = new URL(c.req.url, `http://${c.req.header("host") ?? "localhost"}`)
		.searchParams;

	const limit = Math.min(
		100,
		Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20),
	);
	const cursor = sp.get("cursor");
	const statuses = sp.getAll("status").filter(Boolean);
	const types = sp.getAll("type").filter(Boolean);
	const from = sp.get("from");
	const to = sp.get("to");

	const where: Prisma.IncidentWhereInput = {};

	if (statuses.length) where.status = { in: statuses as Status[] };

	const createdAt: Prisma.DateTimeFilter = {};
	if (from) createdAt.gte = new Date(from);
	if (to) createdAt.lte = new Date(to);
	if (cursor) createdAt.lt = new Date(cursor);
	if (Object.keys(createdAt).length) where.createdAt = createdAt;

	if (types.length) {
		where.OR = types.map((code) => ({
			type: { path: ["code"], equals: code },
		}));
	}

	const items = await prisma.incident.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: limit,
	});

	const nextCursor =
		items.length === limit
			? items[items.length - 1].createdAt.toISOString()
			: null;

	return c.json({ items, limit, nextCursor }, 200);
}

async function open(c: Context) {
	const items = await prisma.incident.findMany({
		where: { status: { in: ["created", "dispatched", "in_progress"] } },
		orderBy: { createdAt: "desc" },
		take: 200,
	});
	return c.json({ items }, 200);
}

async function updateStatus(c: Context) {
	const idStr = c.req.param("id");
	if (!idStr) return c.json({ detail: "missing id" }, 400);

	const id = Number.parseInt(idStr, 10);
	if (Number.isNaN(id)) return c.json({ detail: "invalid id" }, 400);

	const { status } = await parse(c, UpdateStatusSchema);

	const incident = await prisma.incident.findUnique({ where: { id } });
	if (!incident) return c.json({ detail: "not found" }, 404);

	const data: IncidentUpdateInput = { status, version: { increment: 1 } };

	if (status === "dispatched" && !incident.dispatchedAt)
		data.dispatchedAt = new Date();
	if (status === "resolved") data.resolvedAt = new Date();

	const updated = await prisma.incident.update({ where: { id }, data });

	await publishEvent({
		aggregateId: updated.id,
		topic: "incident.status.updated",
		eventType: "IncidentStatusUpdated",
		payload: { id: updated.id, status: updated.status },
	});

	return c.json(updated, 200);
}

async function assign(c: Context) {
	const idStr = c.req.param("id");
	if (!idStr) return c.json({ detail: "missing id" }, 400);

	const id = Number.parseInt(idStr, 10);
	if (Number.isNaN(id)) return c.json({ detail: "invalid id" }, 400);

	const { operatorId } = await parse(c, AssignSchema);

	const incident = await prisma.incident.findUnique({ where: { id } });
	if (!incident) return c.json({ detail: "not found" }, 404);

	const updated = await prisma.incident.update({
		where: { id },
		data: { operatorId: operatorId ?? null, version: { increment: 1 } },
	});

	await publishEvent({
		aggregateId: updated.id,
		topic: "incident.assigned",
		eventType: "IncidentAssigned",
		payload: { id: updated.id, operatorId: updated.operatorId },
	});

	return c.json(updated, 200);
}

export { assign, create, get, listIncidents, open, updateStatus };
