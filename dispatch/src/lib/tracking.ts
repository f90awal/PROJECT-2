import type { Context } from "hono";
import {
	attachTrackingClient,
	detachTrackingClient,
	initializeTrackingBus,
} from "./tracking-bus";

export async function tracking(c: Context) {
	await initializeTrackingBus();

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const client = {
				send(data: string) {
					controller.enqueue(encoder.encode(`data: ${data}\n\n`));
				},
			};

			attachTrackingClient(client);
			client.send(JSON.stringify({ type: "connected" }));

			c.req.raw.signal.addEventListener("abort", () => {
				detachTrackingClient(client);
				controller.close();
			});
		},
		cancel() {},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
