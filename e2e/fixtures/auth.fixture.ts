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
	authenticatedPage: async ({ page, context }, use) => {
		// Set test mode cookie for auth bypass
		await context.addCookies([
			{
				name: "__e2e_test_mode",
				value: "true",
				domain: "localhost",
				path: "/",
			},
			{
				name: "__e2e_user_id",
				value: process.env.E2E_TEST_USER_ID || "user_test_001",
				domain: "localhost",
				path: "/",
			},
			{
				name: "__e2e_user_email",
				value: process.env.E2E_TEST_USER_EMAIL || "test@stratcol.co.za",
				domain: "localhost",
				path: "/",
			},
		]);

		// Navigate to trigger session initialization
		await page.goto("/dashboard");

		await use(page);
	},
});

export { expect } from "@playwright/test";
