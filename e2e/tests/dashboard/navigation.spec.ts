/**
 * Dashboard Navigation Tests
 *
 * Verifies core dashboard navigation and page loading.
 */
import { test, expect } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";

test.describe("Dashboard", () => {
	test("should load dashboard page", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		// Verify we're on the dashboard
		await expect(authenticatedPage).toHaveURL(/.*dashboard/);
	});

	test("should display sidebar navigation", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		// Verify sidebar is visible
		await expect(dashboardPage.sidebar).toBeVisible();
	});

	test("should navigate to applicants page", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		await dashboardPage.navigateToApplicants();
		await expect(authenticatedPage).toHaveURL(/.*applicants/);
	});

	test("should navigate to workflows page", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		await dashboardPage.navigateToWorkflows();
		await expect(authenticatedPage).toHaveURL(/.*workflows/);
	});
});
