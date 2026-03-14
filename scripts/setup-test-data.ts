#!/usr/bin/env bun

/**
 * Setup test data for quote API testing
 * Creates a test applicant and workflow if they don't exist
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

const pool = new Pool({
	connectionString: url,
});
const db = drizzle(pool, { schema });

async function setupTestData() {
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

		// Create a test workflow
		const [testWorkflow] = await db
			.insert(schema.workflows)
			.values([
				{
					applicantId: testApplicant.id,
					stage: 2,
					status: "processing",
				},
			])
			.returning();

		if (!testWorkflow) throw new Error("Failed to create test workflow");

		return { applicant: testApplicant, workflow: testWorkflow };
	} catch (error) {
		console.error("❌ Error setting up test data:", error);
		throw error;
	}
}

setupTestData();
