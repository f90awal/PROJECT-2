import type { Context } from "hono";
import { randomUUID } from "node:crypto";
import { proxy } from "./proxy.js";

export async function log(
	c: Context,
	target: string,
	stripPrefix?: string,
): Promise<Response> {
	const reqId = c.req.header("x-request-id") ?? randomUUID();
	const method = c.req.method;
	const path = new URL(c.req.url).pathname;
	const start = Date.now();

	console.info(
		`[${reqId}] (outbound)  ${method} ${path} → ${target}` +
			(stripPrefix ? ` (strip: ${stripPrefix})` : ""),
	);

	try {
		const res = await proxy(c, target, stripPrefix);
		const duration = Date.now() - start;
		console.info(
			`[${reqId}] (upstream)  ${method} ${path} ← ${target} ${res.status} ${duration}ms`,
		);
		return res;
	} catch (err) {
		const duration = Date.now() - start;
		console.error(
			`[${reqId}] (error) ${method} ${path} ✕ ${target} ${duration}ms`,
			err,
		);
		throw err;
	}
}
