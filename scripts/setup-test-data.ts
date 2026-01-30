#!/usr/bin/env bun

/**
 * Setup test data for quote API testing
 * Creates a test lead and workflow if they don't exist
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

async function setupTestData() {
	console.log("🔧 Setting up test data...\n");

	try {
		// Create a test lead
		const [testLead] = await db
			.insert(schema.leads)
			.values([
				{
					companyName: "Test Company Inc",
					contactName: "John Doe",
					email: "john@testcompany.com",
					phone: "+1234567890",
					industry: "Technology",
					mandateVolume: 500000,
					status: "qualified",
					notes: "Test lead for API testing",
				},
			])
			.returning();

		if (!testLead) throw new Error("Failed to create test lead");

		console.log("✅ Created test lead:");
		console.log(`   ID: ${testLead.id}`);
		console.log(`   Company: ${testLead.companyName}`);
		console.log();

		// Create a test workflow
		const [testWorkflow] = await db
			.insert(schema.workflows)
			.values([
				{
					leadId: testLead.id,
					stage: 2,
					status: "in_progress",
				},
			])
			.returning();

		if (!testWorkflow) throw new Error("Failed to create test workflow");

		console.log("✅ Created test workflow:");
		console.log(`   ID: ${testWorkflow.id}`);
		console.log(`   Lead ID: ${testWorkflow.leadId}`);
		console.log(`   Stage: ${testWorkflow.stage}`);
		console.log();

		console.log("🎉 Test data setup complete!");
		console.log(
			`\n💡 Use workflowId: ${testWorkflow.id} in your test payload\n`,
		);

		return { lead: testLead, workflow: testWorkflow };
	} catch (error) {
		console.error("❌ Error setting up test data:", error);
		throw error;
	}
}

setupTestData();
