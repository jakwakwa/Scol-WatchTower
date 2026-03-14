#!/usr/bin/env bun

import "../envConfig";

import { resolveRequiredDatabaseUrl } from "@/lib/mock-environment";
import { runMockDashboardSmokeChecks, waitForDatabaseReady } from "./mock-db-utils";

async function verify() {
	console.info("🔎 Verifying mock database...");
	const url = resolveRequiredDatabaseUrl("mock");

	await waitForDatabaseReady(url, { label: "Mock database" });
	await runMockDashboardSmokeChecks(url);

	console.info("✅ Mock database verification passed");
}

verify().catch(error => {
	console.error("❌ Mock database verification failed:", error);
	process.exit(1);
});