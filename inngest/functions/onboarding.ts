/**
 * Onboarding Workflow - Main workflow for client onboarding process
 *
 * Stages:
 * 1. Lead Capture & Commitment
 * 2. Dynamic Quotation & Quality Gating
 * 3. Intelligent Verification & Agent Routing
 * 4. Integration & Handover
 */
import { inngest } from "../client";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import {
	sendZapierWebhook,
	dispatchToPlatform,
	escalateToManagement,
} from "@/lib/services/notification.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote } from "@/lib/services/quote.service";
import { analyzeRisk } from "@/lib/services/risk.service";
import type { Events } from "../events";

// Helper for safe step execution with HITL error handling
const runSafeStep = async <T>(
	step: any,
	stepId: string,
	operation: () => Promise<T>,
	context: { workflowId: number; leadId: number; stage: number },
): Promise<T | null> => {
	try {
		// Attempt operation
		return await step.run(stepId, operation);
	} catch (error: any) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[Workflow] Step ${stepId} failed:`, errorMessage);

		// Log error event
		await step.run(`${stepId}-log-error`, () =>
			logWorkflowEvent({
				workflowId: context.workflowId,
				eventType: "error",
				payload: { step: stepId, error: errorMessage, stage: context.stage },
			}),
		);

		// Create notification
		await step.run(`${stepId}-notify-error`, () =>
			createWorkflowNotification({
				workflowId: context.workflowId,
				leadId: context.leadId,
				type: "error",
				title: "Workflow Error - Action Required",
				message: `Step "${stepId}" failed: ${errorMessage}`,
				actionable: true,
				errorDetails: { step: stepId, error: errorMessage },
			}),
		);

		// Pause workflow status
		await step.run(`${stepId}-set-paused`, () =>
			updateWorkflowStatus(context.workflowId, "paused", context.stage),
		);

		// Wait for HITL resolution
		const resolution = await step.waitForEvent(
			`${stepId}-wait-resolution`,
			{
				event: "workflow/error-resolved",
				timeout: "30d",
				match: "data.workflowId",
			},
		);

		if (!resolution || resolution.data.action === "cancel") {
			// User cancelled or timeout
			await step.run(`${stepId}-handle-cancel`, () =>
				updateWorkflowStatus(context.workflowId, "failed", context.stage),
			);
			throw new Error(`Workflow cancelled at step ${stepId}: ${errorMessage}`);
		}

		if (resolution.data.action === "retry") {
			// Recursive retry logic would be ideal, but for now we re-throw to let Inngest retry the step
			// However, since we caught the error, Inngest thinks we succeeded unless we throw.
			// But if we throw, we might loop back here.
			// The correct pattern for "retry now" in this context is to throw an error that Inngest will retry.
			// BUT since we are inside a try/catch block attempting to handle it manually...
			// actually, calling step.run again with same ID might return memoized result if it succeeded before?
			// No, it failed before.

			// Simplified approach: Throwing here ensures Inngest retries the 'runSafeStep' block?
			// No, runSafeStep is a helper, not a step itself.
			// The step.run(stepId, operation) failed.
			// We cannot easily "retry" the exact same step ID within the same execution unless the whole function retries.
			// So, throwing here will cause the workflow to fail (or retry if retries configured).
			// But we WANT to retry.

			// WORKAROUND: We throw a specific error that says "Safe Retry" so Inngest retries the function.
			// Since we waited for an event, the function was effectively paused.
			// When event comes, we continue. We simply throw, Inngest retries the main function from the last checkpoint.
			// The last checkpoint was INSIDE runSafeStep? No.
			// step.run checkpoints the RESULT. If it failed, it didn't checkpoint.
			// So if we throw here, Inngest will retry 'step.run(stepId)'.
			// EXACTLY what we want!

			throw new Error(`[Retry Signal] Retrying step ${stepId} by user request`);
		}

		// Continue (skip step)
		return null;
	}
};

export const onboardingWorkflow = inngest.createFunction(
	{ id: "onboarding-workflow", name: "Onboarding Workflow" },
	{ event: "onboarding/started" },
	async ({ event, step }) => {
		const { leadId, workflowId } = event.data;

		console.log(`[Workflow] STARTED for lead=${leadId} workflow=${workflowId}`);

		// ================================================================
		// Stage 1: Lead Capture & Commitment
		// ================================================================
		await runSafeStep(
			step,
			"stage-1-processing",
			() => updateWorkflowStatus(workflowId, "processing", 1),
			{ workflowId, leadId, stage: 1 },
		);

		await runSafeStep(
			step,
			"stage-1-webhook",
			() =>
				sendZapierWebhook({
					leadId,
					workflowId,
					stage: 1,
					event: "LEAD_CAPTURED",
				}),
			{ workflowId, leadId, stage: 1 },
		);

		// ================================================================
		// Stage 2: Dynamic Quotation & Quality Gating
		// ================================================================
		await runSafeStep(
			step,
			"stage-2-processing",
			() => updateWorkflowStatus(workflowId, "processing", 2),
			{ workflowId, leadId, stage: 2 },
		);

		// Special handling for Quote generation which returns a result object
		const quoteResult = await step.run("stage-2-generate-quote", () =>
			generateQuote(leadId),
		);

		let quote = quoteResult.quote;

		// Handle Quote Error with HITL
		if (!quoteResult.success) {
			const errorMessage = quoteResult.error || "Unknown quote error";

			// Log & Notify
			await step.run("stage-2-quote-error-log", () =>
				logWorkflowEvent({
					workflowId,
					eventType: "error",
					payload: { step: "stage-2-generate-quote", error: errorMessage },
				}),
			);

			await step.run("stage-2-quote-notify", () =>
				createWorkflowNotification({
					workflowId,
					leadId,
					type: "error",
					title: "Quote Generation Failed",
					message: errorMessage,
					actionable: true,
					errorDetails: { error: errorMessage },
				}),
			);

			await step.run("stage-2-quote-pause", () =>
				updateWorkflowStatus(workflowId, "paused", 2),
			);

			// Wait for resolution
			const resolution = await step.waitForEvent(
				"stage-2-quote-wait-resolution",
				{
					event: "workflow/error-resolved",
					match: "data.workflowId",
					timeout: "30d",
				},
			);

			if (!resolution || resolution.data.action === "cancel") {
				await step.run("stage-2-quote-cancel", () =>
					updateWorkflowStatus(workflowId, "failed", 2),
				);
				return { status: "failed", error: errorMessage };
			}

			if (resolution.data.action === "retry") {
				throw new Error("Retrying quote generation...");
			}

			// Continue (force proceed without quote? unlikely, but logic stands)
		}

		if (quote) {
			await runSafeStep(
				step,
				"stage-2-quote-webhook",
				() =>
					sendZapierWebhook({
						leadId,
						workflowId,
						stage: 2,
						event: "QUOTATION_GENERATED",
						quote,
					}),
				{ workflowId, leadId, stage: 2 },
			);
		}

		// Wait for Quality Gate (human validation)
		await runSafeStep(
			step,
			"stage-2-awaiting-human",
			() => updateWorkflowStatus(workflowId, "awaiting_human", 2),
			{ workflowId, leadId, stage: 2 },
		);

		console.log("[Workflow] Waiting for Quality Gate signal...");
		const qualityGateEvent = await step.waitForEvent("wait-for-quality-gate", {
			event: "onboarding/quality-gate-passed",
			match: "data.workflowId",
			timeout: "7d",
		});

		if (!qualityGateEvent) {
			console.error("[Workflow] Quality Gate timeout!");
			await step.run("quality-gate-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2),
			);
			// Also notify about timeout
			await step.run("quality-gate-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					leadId,
					type: "timeout",
					title: "Quality Gate Timeout",
					message: "Workflow timed out waiting for quality gate.",
					actionable: true, // Allow retry/cancel
				}),
			);
			return { status: "timeout", stage: 2, reason: "Quality gate timeout" };
		}

		console.log("[Workflow] Quality Gate Passed!");
		await runSafeStep(
			step,
			"stage-2-quality-passed",
			() => updateWorkflowStatus(workflowId, "processing", 2),
			{ workflowId, leadId, stage: 2 },
		);

		// ================================================================
		// Stage 3: Intelligent Verification & Agent Routing
		// ================================================================
		await runSafeStep(
			step,
			"stage-3-processing",
			() => updateWorkflowStatus(workflowId, "processing", 3),
			{ workflowId, leadId, stage: 3 },
		);

		const aiResult = await runSafeStep(
			step,
			"stage-3-ai-analysis",
			() => analyzeRisk(leadId),
			{ workflowId, leadId, stage: 3 },
		);

		if (!aiResult) {
			// If skipped or failed gracefully
			throw new Error("AI Risk Analysis failed or skipped");
		}

		await runSafeStep(
			step,
			"stage-3-awaiting-agent",
			() => updateWorkflowStatus(workflowId, "awaiting_human", 3),
			{ workflowId, leadId, stage: 3 },
		);

		await runSafeStep(
			step,
			"stage-3-dispatch-to-platform",
			() =>
				dispatchToPlatform({
					leadId,
					workflowId,
					riskScore: aiResult.riskScore,
					anomalies: aiResult.anomalies,
				}),
			{ workflowId, leadId, stage: 3 },
		);

		// Wait for Agent Callback (48h timeout)
		console.log("[Workflow] Waiting for Agent Callback (48h timeout)...");
		let agentEvent = await step.waitForEvent("wait-for-agent-callback", {
			event: "onboarding/agent-callback",
			match: "data.workflowId",
			timeout: "48h",
		});

		// If timeout, pause and wait for human intervention
		if (!agentEvent) {
			console.warn(
				"[Workflow] Agent Callback timeout - pausing for human decision",
			);

			await step.run("agent-timeout-pause", () =>
				updateWorkflowStatus(workflowId, "paused", 3),
			);

			await step.run("agent-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					leadId,
					type: "timeout",
					title: "Agent Callback Timeout",
					message: "Waiting for agent callback timed out. Action required.",
					actionable: true,
				}),
			);

			// Wait for human intervention
			const humanEvent = await step.waitForEvent(
				"wait-for-timeout-resolution",
				{
					event: "onboarding/timeout-resolved",
					match: "data.workflowId",
					timeout: "30d",
				},
			);

			if (!humanEvent) {
				await step.run("final-timeout-update", () =>
					updateWorkflowStatus(workflowId, "timeout", 3),
				);
				return {
					status: "timeout",
					stage: 3,
					reason: "No human intervention after extended pause",
				};
			}

			if (humanEvent.data.action === "cancel") {
				await step.run("cancelled-update", () =>
					updateWorkflowStatus(workflowId, "failed", 3),
				);
				return { status: "cancelled", stage: 3 };
			}

			if (humanEvent.data.action === "continue") {
				// Mock approval if continue
				agentEvent = {
					data: {
						workflowId,
						decision: {
							agentId: "human_override",
							outcome: "APPROVED" as const,
							reason: "Approved by human after timeout",
							timestamp: new Date().toISOString(),
						},
					},
				} as any;
			}
			
			if (humanEvent.data.decision) {
				agentEvent = {
					data: { workflowId, decision: humanEvent.data.decision },
				} as any;
			}
		}

		if (!agentEvent) {
			throw new Error("Unexpected state: No agent event");
		}

		console.log(
			"[Workflow] Agent Callback Received!",
			agentEvent.data.decision,
		);

		// Handle rejection
		if (agentEvent.data.decision?.outcome === "REJECTED") {
			await runSafeStep(
				step,
				"rejected-update",
				() => updateWorkflowStatus(workflowId, "failed", 3),
				{ workflowId, leadId, stage: 3 },
			);
			await runSafeStep(
				step,
				"rejected-webhook",
				() =>
					sendZapierWebhook({
						leadId,
						workflowId,
						stage: 3,
						event: "APPLICATION_REJECTED",
						reason: agentEvent.data.decision.reason,
					}),
				{ workflowId, leadId, stage: 3 },
			);
			return {
				status: "rejected",
				stage: 3,
				reason: agentEvent.data.decision.reason,
			};
		}

		// ================================================================
		// Stage 4: Integration & Handover
		// ================================================================
		await runSafeStep(
			step,
			"stage-4-processing",
			() => updateWorkflowStatus(workflowId, "processing", 4),
			{ workflowId, leadId, stage: 4 },
		);

		await runSafeStep(
			step,
			"stage-4-complete",
			() => updateWorkflowStatus(workflowId, "completed", 4),
			{ workflowId, leadId, stage: 4 },
		);

		await runSafeStep(
			step,
			"stage-4-complete-webhook",
			() =>
				sendZapierWebhook({
					leadId,
					workflowId,
					stage: 4,
					event: "ONBOARDING_COMPLETE",
				}),
			{ workflowId, leadId, stage: 4 },
		);

		console.log("[Workflow] COMPLETED successfully!");
		return { status: "completed", stage: 4 };
	},
);
