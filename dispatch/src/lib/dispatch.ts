import type { Context } from "hono";
import { DispatchStatus, VehicleStatus } from "../generated/prisma/enums";
import { clearIncidentTarget } from "./incident-targets";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";
import { publishTrackingUpdate } from "./tracking-bus";

export async function getActiveDispatches(c: Context) {
	const dispatches = await prisma.dispatch.findMany({
		where: { status: DispatchStatus.active },
		include: {
			vehicle: {
				include: {
					station: true,
					driver: true,
					locations: {
						orderBy: { recordedAt: "desc" },
						take: 1,
					},
				},
			},
		},
		orderBy: { dispatchedAt: "desc" },
	});

	return c.json(dispatches);
}

export async function markDispatchArrived(c: Context) {
	const id = Number(c.req.param("id"));
	if (!Number.isInteger(id) || id < 1) {
		return c.json({ detail: "dispatch id must be a positive integer" }, 400);
	}

	const existing = await prisma.dispatch.findUnique({
		where: { id },
		select: {
			id: true,
			incidentId: true,
			vehicleId: true,
			status: true,
			arrivedAt: true,
		},
	});

	if (!existing) return c.json({ detail: "dispatch not found" }, 404);

	if (existing.status === DispatchStatus.arrived) {
		return c.json(existing);
	}

	const now = new Date();

	const updated = await prisma.$transaction(async (tx) => {
		const dispatch = await tx.dispatch.update({
			where: { id },
			data: {
				status: DispatchStatus.arrived,
				arrivedAt: now,
			},
			include: {
				vehicle: {
					include: {
						driver: true,
						station: true,
					},
				},
			},
		});

		await tx.vehicle.update({
			where: { id: dispatch.vehicleId },
			data: { status: VehicleStatus.on_scene },
		});

		await publishOutboxEvent(tx, {
			aggregateType: "dispatch",
			aggregateId: String(dispatch.id),
			eventType: "VehicleArrived",
			payload: {
				dispatchId: dispatch.id,
				incidentId: dispatch.incidentId,
				vehicleId: dispatch.vehicleId,
				emergencyService: dispatch.vehicle.station.type,
				responderId: dispatch.vehicle.driver?.id ?? null,
				responderName: dispatch.vehicle.driver?.name ?? null,
				region: dispatch.vehicle.station.name,
				arrivedAt: dispatch.arrivedAt,
			},
		});

		return dispatch;
	});

	await publishTrackingUpdate({
		type: "dispatch.vehicle.arrived",
		dispatchId: updated.id,
		incidentId: updated.incidentId,
		vehicleId: updated.vehicleId,
		vehicleStatus: VehicleStatus.on_scene,
		recordedAt: updated.arrivedAt,
	});

	clearIncidentTarget(updated.incidentId);

	return c.json(updated);
}
