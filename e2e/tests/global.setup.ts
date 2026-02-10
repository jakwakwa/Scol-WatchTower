import { clerkSetup, clerk } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

// Setup must be run serially
setup.describe.configure({ mode: "serial" });

// Define the path to the storage file for authenticated state
const authFile = path.join(__dirname, "../../playwright/.clerk/user.json");

/**
 * Global Setup - Initialize Clerk testing token
 * This must run before any tests that use Clerk
 */
setup("global setup", async ({}) => {
	await clerkSetup();
});

/**
 * Authenticate and save state to storage
 * This test signs in with Clerk and saves the auth state for reuse in authenticated tests
 */
setup("authenticate and save state to storage", async ({ page }) => {
	// Navigate to an unprotected page that loads Clerk
	await page.goto("/");

	// Sign in using Clerk test helper with password strategy
	await clerk.signIn({
		page,
		signInParams: {
			strategy: "password",
			identifier: process.env.E2E_CLERK_USER_USERNAME!,
			password: process.env.E2E_CLERK_USER_PASSWORD!,
		},
	});

	// Navigate to the dashboard to verify authentication worked
	await page.goto("/dashboard");

	// Wait for the dashboard to load (verify we're authenticated)
	await expect(
		page.locator('[data-testid="sidebar"]').or(page.locator(".sidebar"))
	).toBeVisible({
		timeout: 10000,
	});

	// Save the auth state for reuse in authenticated tests
	await page.context().storageState({ path: authFile });
});
