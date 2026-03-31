import dotenv from "dotenv";

dotenv.config();

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { authenticate } from "./lib/authenticate.js";
import { SERVICE_ROUTES } from "./lib/ingress.js";
import { log } from "./lib/log.js";
import { resolveRoute } from "./lib/resolve-route.js";

declare global {
	interface BigInt {
		toJSON(): number;
	}
}

const app = new Hono();
const authServiceUrl = process.env.AUTH_SERVICE_URL?.trim();
const safeAuthServiceUrl =
	authServiceUrl && authServiceUrl.length > 0
		? authServiceUrl
		: "http://localhost:3000";

app.use("*", logger());

app.all("/api/auth/*", (c) => log(c, safeAuthServiceUrl));

app.all("/api/*/doc", async (c) => {
	const route = resolveRoute(c);

	if (!route) return c.json({ detail: "Cannot resolve API route" }, 502);

	return log(c, route.baseUrl);
});

app.all("/api/*/ui", async (c) => {
	const route = resolveRoute(c);

	if (!route) return c.json({ detail: "Cannot resolve API route" }, 502);

	return log(c, route.baseUrl);
});

app.use("/api/*", authenticate);

app.all("/api/*", async (c) => {
	const path = new URL(c.req.url).pathname;

	const route = SERVICE_ROUTES.find((r) => path.startsWith(r.prefix));
	if (!route) {
		return c.json({ detail: "Cannot resolve API route" }, 502);
	}

	return log(c, route.baseUrl, route.stripPrefix ? route.prefix : undefined);
});

serve(
	{
		fetch: app.fetch,
		port: Number(process.env.PORT) || 4000,
	},
	(info) => {
		console.log(`Gateway is running on http://localhost:${info.port}`);
		console.log(
			`Gateway routes: auth=${safeAuthServiceUrl}, incident=${SERVICE_ROUTES[0]?.baseUrl ?? "unset"}, dispatch=${SERVICE_ROUTES[1]?.baseUrl ?? "unset"}, analytics=${SERVICE_ROUTES[2]?.baseUrl ?? "unset"}`,
		);

		if (!authServiceUrl) {
			console.warn(
				"AUTH_SERVICE_URL is empty; defaulting to http://localhost:3000",
			);
		}
	},
);
