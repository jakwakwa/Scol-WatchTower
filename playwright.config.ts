import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for StratCol Control Tower
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./e2e/tests",

	/* Run tests in files in parallel */
	fullyParallel: true,

	/* Fail the build on CI if you accidentally left test.only in the source code */
	forbidOnly: !!process.env.CI,

	/* Retry failed tests on CI only */
	retries: process.env.CI ? 2 : 0,

	/* Opt out of parallel tests on CI for stability */
	workers: process.env.CI ? 1 : undefined,

	/* Reporter configuration */
	reporter: [["html", { open: "never" }], ["list"]],

	/* Shared settings for all projects */
	use: {
		/* Base URL for navigation */
		baseURL: "http://localhost:3000",

		/* Collect trace on first retry */
		trace: "on-first-retry",

		/* Screenshot on failure */
		screenshot: "only-on-failure",

		/* Video on failure */
		video: "on-first-retry",
	},

	/* Configure projects for major browsers */
	projects: [
		/* Setup project for auth state */
		{
			name: "setup",
			testMatch: /.*\.setup\.ts/,
		},
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				/* Use stored auth state */
				storageState: "e2e/.auth/user.json",
			},
			dependencies: ["setup"],
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "bun run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});
