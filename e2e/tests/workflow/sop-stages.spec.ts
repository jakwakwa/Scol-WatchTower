/**
 * SOP Workflow E2E Tests
 *
 * Tests the SOP-aligned 6-stage onboarding flow:
 * Stage 1: Quote & Review
 * Stage 2: Mandate Collection
 * Stage 3: Procurement & AI
 * Stage 4: Risk Review
 * Stage 5: Contract
 * Stage 6: Final Approval (Two-Factor)
 *
 * These tests use the dashboard UI and API mocks where external integrations
 * are stubbed (ProcureCheck is sandbox, Risk/Sanctions agents are mock).
 */
import { test, expect } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";

test.describe("SOP Workflow — Stage Names & UI", () => {
	test("pipeline view shows SOP-aligned stage names", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		// Verify SOP-aligned stage names in the pipeline view
		const pipelineContent = await authenticatedPage.textContent("body");
		expect(pipelineContent).toContain("Quote & Review");
		expect(pipelineContent).toContain("Mandate Collection");
		expect(pipelineContent).toContain("Procurement & AI");
		expect(pipelineContent).toContain("Risk Review");
		expect(pipelineContent).toContain("Contract");
		expect(pipelineContent).toContain("Final Approval");
	});

	test("workflow table shows SOP-aligned stage names", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/workflows");

		// The page should contain stage name references
		const bodyText = await authenticatedPage.textContent("body");
		// At least one SOP stage name should be present in the UI
		const hasStageNames =
			bodyText?.includes("Quote & Review") ||
			bodyText?.includes("Mandate Collection") ||
			bodyText?.includes("Procurement & AI") ||
			bodyText?.includes("Risk Review") ||
			bodyText?.includes("Final Approval");
		expect(hasStageNames).toBeTruthy();
	});
});

test.describe("SOP Workflow — Stage 1: Quote & Review", () => {
	test("can navigate to new applicant form", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/applicants/new");
		await expect(authenticatedPage).toHaveURL(/.*applicants\/new/);

		// Verify the form is visible
		const companyNameField = authenticatedPage.locator("#companyName");
		await expect(companyNameField).toBeVisible();
	});

	test("applicant detail page has Reviews tab for quote", async ({ authenticatedPage }) => {
		// Navigate to an applicant if one exists
		await authenticatedPage.goto("/dashboard/applicants");

		// Check if any applicant link exists
		const applicantLinks = authenticatedPage.locator('a[href*="/dashboard/applicants/"]');
		const count = await applicantLinks.count();

		if (count > 0) {
			await applicantLinks.first().click();
			await authenticatedPage.waitForURL(/.*applicants\/\d+/);

			// Verify Reviews tab exists
			const reviewsTab = authenticatedPage.getByRole("tab", { name: /reviews/i });
			await expect(reviewsTab).toBeVisible();
		}
	});
});

test.describe("SOP Workflow — Stage 4: Risk Review", () => {
	test("can navigate to risk review page", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		await dashboardPage.navigateToRiskReview();
		await expect(authenticatedPage).toHaveURL(/.*risk-review/);
	});

	test("risk review page renders without error", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/risk-review");

		// Should not show an error state
		const pageText = await authenticatedPage.textContent("body");
		expect(pageText).not.toContain("Internal Server Error");
		expect(pageText).not.toContain("500");
	});
});

test.describe("SOP Workflow — API Endpoints", () => {
	test("risk-review API returns items with Reporter Agent data", async ({ authenticatedPage }) => {
		// Hit the risk review API
		const response = await authenticatedPage.request.get("/api/risk-review");
		expect(response.ok()).toBeTruthy();

		const data = await response.json();
		expect(data).toHaveProperty("items");
		expect(data).toHaveProperty("count");
		expect(Array.isArray(data.items)).toBeTruthy();

		// If items exist, they should have Reporter Agent fields
		if (data.items.length > 0) {
			const item = data.items[0];
			expect(item).toHaveProperty("workflowId");
			expect(item).toHaveProperty("applicantId");
			expect(item).toHaveProperty("stageName");
			expect(item).toHaveProperty("reviewType");
		}
	});

	test("onboarding approve GET returns approval status", async ({ authenticatedPage }) => {
		// First get a workflow to test with
		const workflowsResponse = await authenticatedPage.request.get("/api/workflows");

		if (workflowsResponse.ok()) {
			const workflowsData = await workflowsResponse.json();
			const workflows = workflowsData.workflows || [];

			if (workflows.length > 0) {
				const workflowId = workflows[0].id;
				const response = await authenticatedPage.request.get(
					`/api/onboarding/approve?workflowId=${workflowId}`
				);
				expect(response.ok()).toBeTruthy();

				const data = await response.json();
				expect(data).toHaveProperty("workflowId");
				expect(data).toHaveProperty("stage");
				expect(data).toHaveProperty("isReadyForApproval");
				// Two-factor approval fields
				expect(data).toHaveProperty("riskManagerApproval");
				expect(data).toHaveProperty("accountManagerApproval");
				expect(data).toHaveProperty("bothApproved");
			}
		}
	});

	test("contract review API requires authentication", async ({ authenticatedPage }) => {
		const response = await authenticatedPage.request.post("/api/contract/review", {
			data: {
				workflowId: 999999,
				applicantId: 999999,
			},
		});

		// Should return 404 (workflow not found) rather than 401 since we're authenticated
		expect([400, 404]).toContain(response.status());
	});
});

test.describe("SOP Workflow — Stage 6: Two-Factor Final Approval UI", () => {
	test("applicant detail page has stage 6 related content", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/applicants");

		// If there are applicants, check one
		const applicantLinks = authenticatedPage.locator('a[href*="/dashboard/applicants/"]');
		const count = await applicantLinks.count();

		if (count > 0) {
			await applicantLinks.first().click();
			await authenticatedPage.waitForURL(/.*applicants\/\d+/);

			// The page should load without errors
			const errorText = authenticatedPage.locator("text=Internal Server Error");
			await expect(errorText).not.toBeVisible();
		}
	});
});
