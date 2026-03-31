import Redis from "ioredis";

const CHANNEL = "dispatch.tracking.live";

const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

type Client = { send: (data: string) => void };
const clients = new Set<Client>();

let subscribed = false;

async function ensureSubscribed() {
	if (subscribed) return;

	await subscriber.subscribe(CHANNEL);
	subscriber.on("message", (channel, message) => {
		if (channel !== CHANNEL) return;
		console.log(
			`[stream:consume] service=dispatch channel=${CHANNEL} subscribers=${clients.size} message=${message}`,
		);
		for (const client of clients) {
			try {
				client.send(message);
			} catch {
				clients.delete(client);
			}
		}
	});

	subscribed = true;
}

export async function initializeTrackingBus() {
	await ensureSubscribed();
}

export function attachTrackingClient(client: Client) {
	clients.add(client);
}

export function detachTrackingClient(client: Client) {
	clients.delete(client);
}

export async function publishTrackingUpdate(payload: object) {
	const message = JSON.stringify(payload);
	console.log(
		`[stream:publish] service=dispatch channel=${CHANNEL} message=${message}`,
	);
	await publisher.publish(CHANNEL, message);
}

export async function closeTrackingBus() {
	await Promise.all([publisher.quit(), subscriber.quit()]);
}
