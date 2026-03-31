import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.js";

export function getPrismaClient(databaseUrl?: string) {
	return new PrismaClient({
		adapter: new PrismaPg({
			connectionString: databaseUrl || process.env.DATABASE_URL,
		}),
	});
}

export * from "./src/generated/prisma/client.js";
