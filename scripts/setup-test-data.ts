#!/usr/bin/env bun

/**
 * Setup test data for quote API testing
 * Creates a test applicant and workflow if they don't exist
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
		// Create a test applicant
		const [testApplicant] = await db
			.insert(schema.applicants)
			.values([
				{
					companyName: "Test Company Inc",
					contactName: "John Doe",
					email: "john@testcompany.com",
					phone: "+1234567890",
					industry: "Technology",
					mandateVolume: 500000,
					status: "qualified",
					notes: "Test applicant for API testing",
				},
			])
			.returning();

		if (!testApplicant) throw new Error("Failed to create test applicant");

		console.log("✅ Created test applicant:");
		console.log(`   ID: ${testApplicant.id}`);
		console.log(`   Company: ${testApplicant.companyName}`);
		console.log();

		// Create a test workflow
		const [testWorkflow] = await db
			.insert(schema.workflows)
			.values([
				{
					applicantId: testApplicant.id,
					stage: 2,
					status: "in_progress",
				},
			])
			.returning();

		if (!testWorkflow) throw new Error("Failed to create test workflow");

		console.log("✅ Created test workflow:");
		console.log(`   ID: ${testWorkflow.id}`);
		console.log(`   Applicant ID: ${testWorkflow.applicantId}`);
		console.log(`   Stage: ${testWorkflow.stage}`);
		console.log();

		console.log("🎉 Test data setup complete!");
		console.log(
			`\n💡 Use workflowId: ${testWorkflow.id} in your test payload\n`,
		);

		return { applicant: testApplicant, workflow: testWorkflow };
	} catch (error) {
		console.error("❌ Error setting up test data:", error);
		throw error;
	}
}

setupTestData();
