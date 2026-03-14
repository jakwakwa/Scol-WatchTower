import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

export function getDatabaseClient() {
	const useTestDatabase = process.env.E2E_USE_TEST_DB === "1";
	const url = useTestDatabase ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

	if (!url) {
		console.error(
			useTestDatabase ? "TEST_DATABASE_URL is not defined" : "DATABASE_URL is not defined"
		);
		return null;
	}

	try {
		const pool = new Pool({
			connectionString: url,
		});

		return drizzle(pool, { schema });
	} catch (error) {
		console.error("Failed to create database client:", error);
	}
}

export { getBaseUrl } from "@/lib/utils";
