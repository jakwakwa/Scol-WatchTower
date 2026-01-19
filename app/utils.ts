import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

export function getDatabaseClient() {
	const url = process.env.TURSO_DATABASE_URL;
	const authToken = process.env.TURSO_AUTH_TOKEN;

	if (!url) {
		console.error("TURSO_DATABASE_URL is not defined");
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
		return null;
	}
}
