#!/usr/bin/env bun
/**
 * Drops every table in the PostgreSQL DB — including Drizzle's internal migration
 * tracking table. Run this before applying a squashed migration from scratch.
 *
 * Usage: bun run scripts/drop-all-tables.ts
 */

import "../envConfig";
import pg from "pg";

const url = process.env.DATABASE_URL;

if (!url) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

async function dropAll() {
	await pool.query("DROP SCHEMA public CASCADE");
	await pool.query("CREATE SCHEMA public");
	await pool.end();
}

dropAll().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
