#!/usr/bin/env bun

import { createClient } from "@libsql/client";

async function resetSchema() {
	const url = process.env.DATABASE_URL;
	const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

	if (!url) {
		console.error("DATABASE_URL is not defined in environment");
		process.exit(1);
	}

	const client = createClient({ url, authToken });

	try {
		await client.execute("PRAGMA foreign_keys = OFF");

		const tables = await client.execute(
			"SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'"
		);

		const objects = tables.rows
			.map(row => ({
				name: row.name,
				type: row.type,
			}))
			.filter(
				(obj): obj is { name: string; type: string } =>
					typeof obj.name === "string" && typeof obj.type === "string"
			);

		if (objects.length === 0) {
		} else {
			for (const obj of objects) {
				const keyword = obj.type === "view" ? "VIEW" : "TABLE";
				await client.execute(`DROP ${keyword} IF EXISTS "${obj.name}"`);
			}
		}

		await client.execute("PRAGMA foreign_keys = ON");
	} catch (error) {
		console.error("Error resetting database schema:", error);
		process.exit(1);
	}
}

resetSchema();
