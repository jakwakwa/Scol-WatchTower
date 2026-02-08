/**
 * Auth Fixture - Clerk Bypass for E2E Tests
 *
 * Provides authenticated page context without requiring real Clerk auth.
 * Uses environment-based bypass pattern.
 */
import { test as base, type Page } from "@playwright/test";

/** Extended test context with auth helpers */
export type AuthFixtures = {
	/** Page with mocked authenticated state */
	authenticatedPage: Page;
};

/**
 * Custom test instance with auth bypass
 */
export const test = base.extend<AuthFixtures>({
	authenticatedPage: async ({ page }, use) => {
		// We rely on 'storageState' in playwright.config.ts to provide authenticated state
		await use(page);
	},
});

export { expect } from "@playwright/test";
