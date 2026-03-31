import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

export async function closeRedis() {
	try {
		await redis.quit();
	} catch {
		// do nothing
	}
}
