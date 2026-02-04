"use server";

import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { internalForms, internalSubmissions, workflows } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { FacilityApplicationForm } from "@/lib/validations/forms";

export async function retryFacilitySubmission(workflowId: number) {
	const db = getDatabaseClient();
	if (!db) {
		return { success: false, error: "Database connection failed" };
	}

	try {
		// 1. Get the workflow to ensure it exists and get applicantId
		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId))
			.limit(1);
		if (!workflowResult.length) {
			return { success: false, error: "Workflow not found" };
		}
		const applicantId = workflowResult[0].applicantId;

		// 2. Find the facility application form for this workflow
		const formResults = await db
			.select()
			.from(internalForms)
			.where(
				and(
					eq(internalForms.workflowId, workflowId),
					eq(internalForms.formType, "facility_application")
				)
			)
			.limit(1);

		if (formResults.length === 0) {
			return { success: false, error: "Facility application form not found" };
		}
		const form = formResults[0];

		// 3. Get the latest submission
		const submissionResults = await db
			.select()
			.from(internalSubmissions)
			.where(eq(internalSubmissions.internalFormId, form.id))
			.orderBy(desc(internalSubmissions.createdAt))
			.limit(1);

		if (submissionResults.length === 0) {
			return { success: false, error: "No submission found for facility application" };
		}
		const submission = submissionResults[0];

		// 4. Parse the form data
		let formData: FacilityApplicationForm;
		try {
			formData = JSON.parse(submission.formData);
		} catch (_e) {
			return { success: false, error: "Failed to parse form data" };
		}

		// 5. Construct the event payload (same logic as in the route handler)
		const serviceTypes = formData.serviceTypes || [];

		let mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED" = "EFT";
		const hasDebicheck = serviceTypes.includes("DebiCheck");
		const hasEft = serviceTypes.some(type => type !== "DebiCheck");

		if (hasDebicheck && hasEft) {
			mandateType = "MIXED";
		} else if (hasDebicheck) {
			mandateType = "DEBIT_ORDER";
		}

		const mandateVolume = (formData.maxRandValue || 0) * 100;

		// 6. Send the event
		await inngest.send({
			name: "form/facility.submitted",
			data: {
				workflowId: workflowId,
				applicantId: applicantId,
				submissionId: submission.id,
				formData: {
					mandateVolume,
					mandateType,
					businessType: "Unknown",
					annualTurnover:
						(formData.forecastVolume || 0) * (formData.forecastAverageValue || 0) * 12,
				},
				submittedAt: new Date().toISOString(),
			},
		});

		return { success: true, message: "Event re-triggered successfully" };
	} catch (error) {
		console.error("Failed to retry facility submission:", error);
		return { success: false, error: "Unexpected error" };
	}
}
