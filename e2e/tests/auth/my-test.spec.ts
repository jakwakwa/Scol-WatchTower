import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test } from "@playwright/test";

test("sign up", async ({ page }) => {
	await setupClerkTestingToken({ page });

	await page.goto("/sign-up");
	// Add additional test logic here
});
