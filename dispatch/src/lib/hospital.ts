import type { Context } from "hono";
import { UpdateCapacitySchema } from "./dto";
import { parse } from "./http";
import { publishOutboxEvent } from "./outbox";
import { prisma } from "./prisma.server";

async function updateCapacity(c: Context) {
	const id = c.req.param("id");
	if (!id) return c.json({ detail: "missing id" }, 400);

	const data = await parse(c, UpdateCapacitySchema);

	const hospital = await prisma.hospital.findUnique({
		where: { id: Number(id) },
	});
	if (!hospital) return c.json({ detail: "not found" }, 404);

	const updated = await prisma.$transaction(async (tx) => {
		const hospitalUpdated = await tx.hospital.update({
			where: { id: Number(id) },
			data,
		});

		await publishOutboxEvent(tx, {
			aggregateType: "hospital",
			aggregateId: String(hospitalUpdated.id),
			eventType: "HospitalCapacityUpdated",
			payload: {
				hospitalId: hospitalUpdated.id,
				hospitalName: hospitalUpdated.name,
				region: hospitalUpdated.name,
				totalBeds: hospitalUpdated.totalBeds,
				availableBeds: hospitalUpdated.availableBeds,
				totalAmbulances: hospitalUpdated.totalAmbulances,
				availableAmbulances: hospitalUpdated.availableAmbulances,
				capturedAt: new Date().toISOString(),
			},
		});

		return hospitalUpdated;
	});
	return c.json(updated, 200);
}

export { updateCapacity };
