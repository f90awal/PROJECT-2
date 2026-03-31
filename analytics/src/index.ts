import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import dotenv from "dotenv";
import { Hono } from "hono";
import { logger } from "hono/logger";
import {
	incidentsByRegion,
	resourceUtilization,
	responseTimes,
} from "./lib/analytics";
import { startAnalyticsConsumer } from "./lib/consumer";
import { openApiDoc } from "./lib/swagger";

declare global {
	interface BigInt {
		toJSON(): number;
	}
}

dotenv.config();

BigInt.prototype.toJSON = function () {
	return Number(this);
};

const app = new Hono();

const analytics = app.basePath("/api/analytics");

analytics.use("*", logger());

analytics.get("/response-times", responseTimes);

analytics.get("/incidents-by-region", incidentsByRegion);

analytics.get("/resource-utilization", resourceUtilization);

analytics.get("/doc", (c) => c.json(openApiDoc));

analytics.get("/ui", swaggerUI({ url: "/api/analytics/doc" }));

serve(
	{
		fetch: analytics.fetch,
		port: Number(process.env.PORT) || 4003,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
		startAnalyticsConsumer().catch((error) => {
			console.error("Failed to start analytics consumer:", error);
		});
	},
);
