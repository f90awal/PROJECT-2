import type { Incident } from "../generated/prisma/browser";

export type NearbyIncident = Incident & { distance_km: number };
