/**
 * Database Fixture - Test Database Utilities
 *
 * Provides database reset and seeding capabilities for isolated tests.
 */
import { test as base } from "@playwright/test";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type DatabaseFixtures = {
	/** Reset database before test */
	resetDatabase: () => Promise<void>;
};

export const test = base.extend<DatabaseFixtures>({
	resetDatabase: async ({}, use) => {
		const reset = async () => {
			await execAsync("bun run scripts/reset-test-db.ts", {
				cwd: process.cwd(),
				env: { ...process.env, NODE_ENV: "test" },
			});
		};

		await use(reset);
	},
});

export { expect } from "@playwright/test";
