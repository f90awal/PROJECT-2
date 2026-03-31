import type { Context } from "hono";
import { treeifyError, type ZodSchema } from "zod";

export async function parse<T>(c: Context, schema: ZodSchema<T>): Promise<T> {
	const body = await c.req.json().catch(() => null);
	if (!body) throw c.json({ detail: "invalid json body" }, 400);

	const parsed = schema.safeParse(body);
  
	if (!parsed.success) {
		throw c.json(
			{ detail: "validation failed", errors: treeifyError(parsed.error) },
			400,
		);
	}

	return parsed.data;
}