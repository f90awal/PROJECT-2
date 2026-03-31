import type { Context } from "hono";
import type { JwtUser } from "./types.js";

async function proxy(c: Context, base: string, stripPrefix?: string) {
	const incoming = new URL(
		c.req.url,
		`http://${c.req.header("host") ?? "localhost"}`,
	);
	// []: change to https before deployment

	let path = incoming.pathname;

	if (stripPrefix && path.startsWith(stripPrefix)) {
		path = path.slice(stripPrefix.length) || "/";
	}

	const target = new URL(path + incoming.search, base);

	const headers = new Headers(c.req.raw.headers);

	const user = c.get("user") as JwtUser | undefined;

	if (user?.sub) headers.set("x-user-id", String(user.sub));
	if (user?.role) headers.set("x-user-role", String(user.role));

	const method = c.req.method.toUpperCase();
	const init: RequestInit = { method, headers };

	if (!["GET", "HEAD"].includes(method)) {
		const body = c.req.raw.body ?? null;
		if (body) {
			init.body = body;
			// Node's fetch requires duplex when forwarding a streaming body
			// @ts-ignore
			init.duplex = "half";
		}
	}

	return fetch(target, init);
}

export { proxy };
