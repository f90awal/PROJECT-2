import { z } from "zod";
import {
	StationType,
	VehicleStatus,
	VehicleType,
} from "../generated/prisma/enums";

export const RegisterVehicleSchema = z.object({
	callSign: z.string().trim().min(1),
	type: z.enum(VehicleType),
	stationId: z.number().int().positive(),
	status: z.enum(VehicleStatus).default(VehicleStatus.available),
});

export const UpdateVehicleLocationSchema = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
	speed: z.number().min(0).nullable().optional(),
	heading: z.number().min(0).max(360).nullable().optional(),
	recordedAt: z.iso.datetime().optional(),
});

export const RegisterDriverSchema = z.object({
	name: z.string().trim().min(1),
	phone: z.string().trim().min(1).optional(),
	vehicleId: z.number().int().positive(),
});

export const UpdateDriverLocationSchema = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
	recordedAt: z.iso.datetime().optional(),
});

export const UpdateCapacitySchema = z.object({
	availableBeds: z.number().int().min(0).optional(),
	totalBeds: z.number().int().min(0).optional(),
	availableAmbulances: z.number().int().min(0).optional(),
	totalAmbulances: z.number().int().min(0).optional(),
});

export const RegisterStationSchema = z.object({
	name: z.string().trim().min(2),
	type: z.enum(StationType),
	location: z.object({
		address: z.string().trim().min(3),
		lat: z.number().min(-90).max(90),
		lng: z.number().min(-180).max(180),
	}),
	respondersCount: z.union([z.literal(3), z.literal(4)]).default(4),
});

export const SeedStationsSchema = z.object({
	reset: z.boolean().default(true),
	profile: z.enum(["small", "full"]).default("full"),
});

export type RegisterVehiclePayload = z.infer<typeof RegisterVehicleSchema>;
export type UpdateVehicleLocationPayload = z.infer<
	typeof UpdateVehicleLocationSchema
>;
export type RegisterDriverPayload = z.infer<typeof RegisterDriverSchema>;
export type UpdateDriverLocationPayload = z.infer<
	typeof UpdateDriverLocationSchema
>;
export type RegisterStationPayload = z.infer<typeof RegisterStationSchema>;
export type SeedStationsPayload = z.infer<typeof SeedStationsSchema>;
