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
		// Delete in correct order to respect foreign key constraints
		// (child tables first, parent tables last)

		// Level 5: Deepest children
		console.log("Deleting Signatures...");
		await db.delete(schema.signatures);

		console.log("Deleting Internal Submissions...");
		await db.delete(schema.internalSubmissions);

		// Level 4: Tables referencing internal_forms
		console.log("Deleting Document Uploads...");
		await db.delete(schema.documentUploads);

		// Level 3: Tables referencing workflows
		console.log("Deleting Internal Forms...");
		await db.delete(schema.internalForms);

		console.log("Deleting Agent Callbacks...");
		await db.delete(schema.agentCallbacks);

		console.log("Deleting Workflow Events...");
		await db.delete(schema.workflowEvents);

		console.log("Deleting Quotes...");
		await db.delete(schema.quotes);

		console.log("Deleting Notifications...");
		await db.delete(schema.notifications);

		console.log("Deleting Applicant Submissions...");
		await db.delete(schema.applicantSubmissions);

		console.log("Deleting Applicant Magiclink Forms...");
		await db.delete(schema.applicantMagiclinkForms);

		// Level 2: Tables referencing applicants
		console.log("Deleting Workflows...");
		await db.delete(schema.workflows);

		console.log("Deleting Documents...");
		await db.delete(schema.documents);

		console.log("Deleting Risk Assessments...");
		await db.delete(schema.riskAssessments);

		console.log("Deleting Activity Logs...");
		await db.delete(schema.activityLogs);

		// Level 1: Root tables
		console.log("Deleting Applicants...");
		await db.delete(schema.applicants);

		console.log("Deleting Agents...");
		await db.delete(schema.agents);

		console.log("Deleting Todos...");
		await db.delete(schema.todos);

		console.log("✅ Database reset complete - all records deleted.");
	} catch (error) {
		console.error("Error resetting database:", error);
		process.exit(1);
	}
}

reset();
