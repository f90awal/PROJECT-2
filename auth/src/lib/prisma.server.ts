import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { makeSingleton } from "./singleton";

dotenv.config();

const prisma = makeSingleton("prisma", () => {
	const prisma = new PrismaClient({
		adapter: new PrismaPg({
			connectionString: String(process.env.DATABASE_URL!),
		}),
	});

	prisma.$connect();

	return prisma;
});

export { prisma };
