import type { Context } from "hono";
import { treeifyError } from "zod";
import { NearbySchema } from "./dto";
import { prisma } from "./prisma.server";
import type { NearbyIncident } from "./types";

// this endpoint returns all active incidents within a given radius of a GPS coordinate.

// Intended for dispatch operators to assess situational awareness before
// allocating resources — e.g. detecting incident clusters, avoiding duplicate
// dispatches, or identifying whether a new report is related to an existing event.
async function nearby(c: Context) {
	const sp = new URL(c.req.url, `http://${c.req.header("host") ?? "localhost"}`)
		.searchParams;

	const parsed = NearbySchema.safeParse({
		lat: sp.get("lat"),
		lng: sp.get("lng"),
		radius: sp.get("radius"),
	});

	if (!parsed.success) {
		return c.json(
			{ detail: "validation failed", errors: treeifyError(parsed.error) },
			400,
		);
	}

	const { lat, lng, radius } = parsed.data;

	// Using PostGIS extension

	// extract [lat, lng] from the location JSON, cast to geography, then filter by radius using a spatial index
	// ST_DWithin takes meters so radius is multiplied by 1000, ST_Distance result is divided back to km
	const items = await prisma.$queryRaw<NearbyIncident[]>`
  SELECT *,
    ST_Distance(
      ST_MakePoint((location->'center'->>1)::float, (location->'center'->>0)::float)::geography,
      ST_MakePoint(${lng}, ${lat})::geography
    ) / 1000 AS distance_km
  FROM "Incident"
  WHERE status NOT IN ('resolved', 'cancelled')
    AND ST_DWithin(
      ST_MakePoint((location->'center'->>1)::float, (location->'center'->>0)::float)::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radius * 1000}
    )
  ORDER BY distance_km ASC
  LIMIT 50
`;

	return c.json({ items }, 200);
}

export { nearby };
