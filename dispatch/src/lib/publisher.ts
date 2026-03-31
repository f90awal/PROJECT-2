import Redis from "ioredis";
import { BATCH_SIZE, OUTBOX_TOPIC, POLL_INTERVAL_MS } from "./consts";
import {
	claimPendingOutbox,
	markOutboxFailed,
	markOutboxPublished,
} from "./outbox";
import { serializePayload } from "./serialize-payload";

const redis = new Redis(process.env.REDIS_URL!);

async function publishBatch() {
	const rows = await claimPendingOutbox(BATCH_SIZE);
	if (!rows.length) return;

	for (const row of rows) {
		try {
			const entryId = await redis.xadd(
				OUTBOX_TOPIC,
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
				`[stream:publish] service=dispatch stream=${OUTBOX_TOPIC} entryId=${entryId} outboxId=${row.id} eventType=${row.eventType} aggregateType=${row.aggregateType} aggregateId=${row.aggregateId}`,
			);

			await markOutboxPublished(row.id);
		} catch (error) {
			const backoff = Math.min(5 * 60 * 1000, 2 ** row.attempts * 1000);
			await markOutboxFailed(row.id, backoff);
			console.error(
				`Dispatch outbox publish failed (id=${row.id}). retry in ${backoff}ms`,
				error,
			);
		}
	}
}

let timer: NodeJS.Timeout | undefined;

export function startPublisher() {
	if (timer) return;

	timer = setInterval(() => {
		publishBatch().catch((error) =>
			console.error("Dispatch outbox loop error:", error),
		);
	}, POLL_INTERVAL_MS);

	console.log(
		`Dispatch outbox publisher running: stream=${OUTBOX_TOPIC}, interval=${POLL_INTERVAL_MS}ms`,
	);
}

export async function stopPublisher() {
	if (timer) {
		clearInterval(timer);
		timer = undefined;
	}

	await redis.quit();
}
