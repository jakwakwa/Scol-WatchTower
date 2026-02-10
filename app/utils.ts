import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

export function getDatabaseClient() {
	const url = process.env.DATABASE_URL;
	const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

	if (!url) {
		console.error("DATABASE_URL is not defined");
		return null;
	}

	try {
		const client = createClient({
			url,
			authToken,
		});

		return drizzle(client, { schema });
	} catch (error) {
		console.error("Failed to create database client:", error);
	}
}

export { getBaseUrl } from "@/lib/utils";
