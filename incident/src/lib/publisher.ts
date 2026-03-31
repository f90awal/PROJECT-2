import Redis from "ioredis";
import {
	claimPendingOutbox,
	markOutboxFailed,
	markOutboxPublished,
} from "../lib/outbox.js";
import { BATCH_SIZE, POLL_INTERVAL_MS, STREAM } from "./consts.js";
import { serializePayload } from "./serialize-payload.js";

const redis = new Redis(process.env.REDIS_URL!);

async function publishBatch() {
	const rows = await claimPendingOutbox(BATCH_SIZE);
	if (!rows.length) return;

	for (const row of rows) {
		try {
			const entryId = await redis.xadd(
				STREAM,
				"*",
				"eventType",
				row.eventType,
				"aggregateType",
				row.aggregateType,
				"aggregateId",
				row.aggregateId,
				"payload",
				serializePayload(row.payload),
			);

			console.log(
				`[stream:publish] service=incident stream=${STREAM} entryId=${entryId} outboxId=${row.id} eventType=${row.eventType} aggregateType=${row.aggregateType} aggregateId=${row.aggregateId}`,
			);

			await markOutboxPublished(row.id);
		} catch (err) {
			const backoff = Math.min(5 * 60 * 1000, 2 ** row.attempts * 1000);
			await markOutboxFailed(row.id, backoff);
			console.error(
				`Outbox publish failed (id=${row.id}). retry in ${backoff}ms`,
				err,
			);
		}
	}
}

let timer: NodeJS.Timeout | undefined;

export function startPublisher() {
	if (timer) return;

	timer = setInterval(() => {
		publishBatch().catch((err) => console.error("Outbox loop error:", err));
	}, POLL_INTERVAL_MS);

	console.log(
		`Outbox publisher running: stream=${STREAM}, interval=${POLL_INTERVAL_MS}ms`,
	);
}

export async function stopOutboxPublisher() {
	if (timer) {
		clearInterval(timer);
		timer = undefined;
	}
	await redis.quit();
}
