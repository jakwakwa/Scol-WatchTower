#!/usr/bin/env bun
/**
 * Reset the E2E test database (Turso).
 * Loads .env.test only (not .env.local) so TEST_* vars are used.
 *
 * Usage: bun run test:db:reset
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

// Load .env.test only — avoid .env.local so we use the test database
config({ path: resolve(process.cwd(), ".env.test"), override: true });

const url = process.env.TEST_DATABASE_URL;

if (!url) {
	console.error("❌ TEST_DATABASE_URL is not defined in .env.test");
	console.error("   Copy .env.test.example to .env.test and add your test database URL.");
	process.exit(1);
}

const { Pool } = await import("pg");
const pool = new Pool({ connectionString: url });

async function reset() {
	console.info("🧹 Resetting test database...");

	await pool.query("DROP SCHEMA public CASCADE;");
	await pool.query("CREATE SCHEMA public;");
	await pool.query("GRANT ALL ON SCHEMA public TO postgres;");
	await pool.query("GRANT ALL ON SCHEMA public TO public;");
	
	await pool.end();

	// Run migrations against test DB (uses drizzle.test.config.ts)
	execSync("bun run db:migrate:test", {
		stdio: "inherit",
		cwd: process.cwd(),
	});

	console.info("✅ Test database reset complete");
}

reset().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
