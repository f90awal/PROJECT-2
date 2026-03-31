import { z } from "zod";

export const IncidentLocationSchema = z.object({
	address: z.string(),
	center: z.tuple([z.number(), z.number()]), // [lat, lng]
	radius: z.number().nonnegative(),
});

export const IncidentTypeSchema = z.object({
	code: z.string(),
	category: z.string().optional(),
});

export const IncidentPrioritySchema = z.object({
	level: z.enum(["low", "medium", "high"]),
	score: z.number().optional(),
	escalationMins: z.number().optional(),
});

export const IncidentMetadataSchema = z
	.object({
		callerName: z.string().min(1),
		callerContact: z.string().min(1),
		notes: z.string().optional(),
	})
	.strict();

export const CreateIncidentSchema = z.object({
	type: IncidentTypeSchema,
	description: z.string().optional(),
	location: IncidentLocationSchema,
	priority: IncidentPrioritySchema,
	metadata: IncidentMetadataSchema.optional(),
});

const StatusSchema = z.enum([
	"created",
	"dispatched",
	"in_progress",
	"resolved",
	"cancelled",
]);

export const UpdateStatusSchema = z.object({
	status: StatusSchema,
});

export const AssignSchema = z.object({
	operatorId: z.string().nullable(),
});

export const NearbySchema = z.object({
	lat: z.coerce.number().min(-90).max(90),
	lng: z.coerce.number().min(-180).max(180),
	radius: z.coerce.number().min(0).max(500).default(10),
});
