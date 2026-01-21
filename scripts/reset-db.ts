import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

async function reset() {
	const url = process.env.DATABASE_URL;
	const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

	if (!url) {
		console.error("DATABASE_URL is not defined in environment");
		process.exit(1);
	}

	const client = createClient({
		url,
		authToken,
	});

	const db = drizzle(client, { schema });

	console.log("Resetting database records...");

	try {
		// Delete transactional data first (dependent tables)
		console.log("Deleting Zapier Callbacks...");
		await db.delete(schema.zapierCallbacks);

		console.log("Deleting Workflow Events...");
		await db.delete(schema.workflowEvents);

		console.log("Deleting Quotes...");
		await db.delete(schema.quotes);

		console.log("Deleting Workflows...");
		await db.delete(schema.workflows);

		console.log("Deleting Leads...");
		await db.delete(schema.leads);

		// Optional: Delete agents if they are considered "seed data" the user wants gone.
		// Usually "clean" means empty.
		console.log("Deleting Agents...");
		await db.delete(schema.agents);

		console.log("Deleting Todos...");
		await db.delete(schema.todos);

		console.log("✅ Database reset complete.");
	} catch (error) {
		console.error("Error resetting database:", error);
		process.exit(1);
	}
}

reset();
