import type { Context } from "hono";
import { treeifyError } from "zod";
import { RegisterDriverSchema, UpdateDriverLocationSchema } from "./dto";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";
import { publishTrackingUpdate } from "./tracking-bus";

export async function registerDriver(c: Context) {
	const parsed = RegisterDriverSchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json({ detail: treeifyError(parsed.error) }, 400);
	}

	const { name, phone, vehicleId } = parsed.data;

	const vehicle = await prisma.vehicle.findUnique({
		where: { id: vehicleId },
		select: { id: true },
	});
	if (!vehicle) return c.json({ detail: "vehicle not found" }, 404);

	const existing = await prisma.driver.findFirst({
		where: { vehicleId },
		select: { id: true },
	});
	if (existing) {
		return c.json({ detail: "vehicle already has a driver" }, 409);
	}

	const driver = await prisma.$transaction(async (tx) => {
		const created = await tx.driver.create({
			data: {
				name,
				phone,
				vehicleId,
			},
			include: {
				vehicle: true,
			},
		});

		await publishOutboxEvent(tx, {
			aggregateType: "driver",
			aggregateId: String(created.id),
			eventType: "DriverRegistered",
			payload: {
				id: created.id,
				name: created.name,
				phone: created.phone,
				vehicleId: created.vehicleId,
				createdAt: created.createdAt,
			},
		});

		return created;
	});

	return c.json(driver, 201);
}

function parseDriverId(c: Context): number | Response {
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id) || id < 1) {
		return c.json({ detail: "driver id must be a positive integer" }, 400);
	}
	return id;
}

export async function updateDriverLocation(c: Context) {
	const parsedId = parseDriverId(c);
	if (parsedId instanceof Response) return parsedId;
	const id = parsedId;

	const parsed = UpdateDriverLocationSchema.safeParse(
		await c.req.json().catch(() => null),
	);
	if (!parsed.success) {
		return c.json({ detail: treeifyError(parsed.error) }, 400);
	}

	const driver = await prisma.driver.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!driver) return c.json({ detail: "driver not found" }, 404);

	const { lat, lng, recordedAt } = parsed.data;

	const location = await prisma.$transaction(async (tx) => {
		const created = await tx.driverLocation.create({
			data: {
				driverId: id,
				lat,
				lng,
				recordedAt: recordedAt ? new Date(recordedAt) : undefined,
			},
		});

		await tx.driver.update({
			where: { id },
			data: { updatedAt: new Date() },
		});

		return created;
	});

	await publishTrackingUpdate({
		type: "driver.location.updated",
		driverId: id,
		lat: location.lat,
		lng: location.lng,
		recordedAt: location.recordedAt,
	});

	return c.json(location, 201);
}
