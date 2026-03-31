import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { startDispatchConsumer } from "./lib/dispatch-consumer";
import {
	assign,
	create,
	get,
	listIncidents,
	open,
	updateStatus,
} from "./lib/incident";
import { startPublisher } from "./lib/publisher";
import { nearby } from "./lib/responders";
import { openApiDoc } from "./lib/swagger";

declare global {
	interface BigInt {
		toJSON(): number;
	}
}

const app = new Hono();

app.use(logger());

const incident = app.basePath("/api/incident");

// Incident service is an internal app shielded behind the API gateway proxy.
// Like other internal services, it does not authenticate request since all of
// that is done by the proxy.

// We assume that a request received is authenticated and has the attached user claims
// in the request headers

incident.post("", create);
incident.post("/", create);

incident.get("/", listIncidents);
incident.get("", listIncidents);

incident.get("/open", open);

incident.get("/nearby", nearby);

incident.get("/doc", (c) => c.json(openApiDoc));

incident.get("/ui", swaggerUI({ url: "/api/incident/doc" }));

incident.get("/:id", get);

incident.put("/:id/status", updateStatus);

incident.put("/:id/assign", assign);

serve(
	{
		fetch: incident.fetch,
		port: Number(process.env.PORT) || 4001,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
		startPublisher();
		startDispatchConsumer().catch((error) => {
			console.error("Failed to start dispatch consumer:", error);
		});
	},
);
