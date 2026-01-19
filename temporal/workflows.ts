import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities";

const { sendZapierWebhook, updateDbStatus } = proxyActivities<
	typeof activities
>({
	startToCloseTimeout: "1 minute",
});

export interface OnboardingWorkflowArgs {
	leadId: number;
	workflowId: number;
}

export async function onboardingWorkflow({
	leadId,
	workflowId,
}: OnboardingWorkflowArgs): Promise<void> {
	// Stage 1: Lead Capture
	await updateDbStatus(workflowId, "processing", 1);
	await sendZapierWebhook({ leadId, stage: 1, event: "LEAD_CAPTURED" });

	// Simulate some processing or wait for signal
	await sleep("10 seconds");

	// Stage 2: Quotation
	await updateDbStatus(workflowId, "processing", 2);
	await sendZapierWebhook({ leadId, stage: 2, event: "QUOTATION_REQUESTED" });

	// Simulate external interaction
	await sleep("5 seconds");

	// Stage 3: Verification
	await updateDbStatus(workflowId, "processing", 3);
	await sendZapierWebhook({ leadId, stage: 3, event: "VERIFICATION_STARTED" });

	await sleep("5 seconds");

	// Stage 4: Integration (Complete)
	await updateDbStatus(workflowId, "completed", 4);
	await sendZapierWebhook({ leadId, stage: 4, event: "ONBOARDING_COMPLETE" });
}
