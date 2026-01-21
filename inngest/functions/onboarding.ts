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
import { generateQuote } from "@/lib/services/quote.service";
import { analyzeRisk } from "@/lib/services/risk.service";

export const onboardingWorkflow = inngest.createFunction(
	{ id: "onboarding-workflow", name: "Onboarding Workflow" },
	{ event: "onboarding/started" },
	async ({ event, step }) => {
		const { leadId, workflowId } = event.data;

		console.log(`[Workflow] STARTED for lead=${leadId} workflow=${workflowId}`);

		// ================================================================
		// Stage 1: Lead Capture & Commitment
		// ================================================================
		await step.run("stage-1-processing", () =>
			updateWorkflowStatus(workflowId, "processing", 1),
		);

		await step.run("stage-1-webhook", () =>
			sendZapierWebhook({
				leadId,
				workflowId,
				stage: 1,
				event: "LEAD_CAPTURED",
			}),
		);

		// ================================================================
		// Stage 2: Dynamic Quotation & Quality Gating
		// ================================================================
		await step.run("stage-2-processing", () =>
			updateWorkflowStatus(workflowId, "processing", 2),
		);

		const quote = await step.run("stage-2-generate-quote", () =>
			generateQuote(leadId),
		);

		await step.run("stage-2-quote-webhook", () =>
			sendZapierWebhook({
				leadId,
				workflowId,
				stage: 2,
				event: "QUOTATION_GENERATED",
				quote,
			}),
		);

		// Wait for Quality Gate (human validation)
		await step.run("stage-2-awaiting-human", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2),
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
			return { status: "timeout", stage: 2, reason: "Quality gate timeout" };
		}

		console.log("[Workflow] Quality Gate Passed!");
		await step.run("stage-2-quality-passed", () =>
			updateWorkflowStatus(workflowId, "processing", 2),
		);

		// ================================================================
		// Stage 3: Intelligent Verification & Agent Routing
		// ================================================================
		await step.run("stage-3-processing", () =>
			updateWorkflowStatus(workflowId, "processing", 3),
		);

		const aiResult = await step.run("stage-3-ai-analysis", () =>
			analyzeRisk(leadId),
		);

		await step.run("stage-3-awaiting-agent", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 3),
		);

		await step.run("stage-3-dispatch-to-platform", () =>
			dispatchToPlatform({
				leadId,
				workflowId,
				riskScore: aiResult.riskScore,
				anomalies: aiResult.anomalies,
			}),
		);

		// Wait for Agent Callback (48h timeout)
		console.log("[Workflow] Waiting for Agent Callback (48h timeout)...");
		let agentEvent = await step.waitForEvent("wait-for-agent-callback", {
			event: "onboarding/agent-callback",
			match: "data.workflowId",
			timeout: "48h",
		});

		// If timeout, pause and wait for human intervention (retry/cancel/continue)
		if (!agentEvent) {
			console.warn(
				"[Workflow] Agent Callback timeout - pausing for human decision",
			);

			await step.run("agent-timeout-pause", () =>
				updateWorkflowStatus(workflowId, "paused", 3),
			);

			// Notify management about the pause
			await step.run("agent-timeout-notify", () =>
				escalateToManagement({
					workflowId,
					leadId,
					reason:
						"Risk Verification Timeout (48h) - Awaiting human decision (retry/cancel)",
				}),
			);

			// Wait for human intervention - they can either:
			// 1. Send agent-callback with decision (retry succeeded or manual decision)
			// 2. Send timeout-resolved with action (cancel/continue)
			console.log("[Workflow] Paused - waiting for human intervention...");
			const humanEvent = await step.waitForEvent(
				"wait-for-timeout-resolution",
				{
					event: "onboarding/timeout-resolved",
					match: "data.workflowId",
					timeout: "30d", // Extended wait for human action
				},
			);

			if (!humanEvent) {
				// Final timeout after 30 days of pause
				await step.run("final-timeout-update", () =>
					updateWorkflowStatus(workflowId, "timeout", 3),
				);
				return {
					status: "timeout",
					stage: 3,
					reason: "No human intervention after extended pause",
				};
			}

			// Handle human decision
			if (humanEvent.data.action === "cancel") {
				await step.run("cancelled-update", () =>
					updateWorkflowStatus(workflowId, "failed", 3),
				);
				return {
					status: "cancelled",
					stage: 3,
					reason: "Cancelled by human after timeout",
				};
			}

			if (humanEvent.data.action === "continue") {
				// Continue without agent decision - human approved
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

			// If action is "retry", the agentEvent might have been provided with the resolution
			if (humanEvent.data.decision) {
				agentEvent = {
					data: { workflowId, decision: humanEvent.data.decision },
				} as any;
			}
		}

		// Guard: agentEvent must be set at this point
		if (!agentEvent) {
			await step.run("unexpected-null-update", () =>
				updateWorkflowStatus(workflowId, "failed", 3),
			);
			return {
				status: "failed",
				stage: 3,
				reason: "Unexpected: no agent event after HITL handling",
			};
		}

		console.log(
			"[Workflow] Agent Callback Received!",
			agentEvent.data.decision,
		);

		// Handle rejection
		if (agentEvent.data.decision?.outcome === "REJECTED") {
			await step.run("rejected-update", () =>
				updateWorkflowStatus(workflowId, "failed", 3),
			);
			await step.run("rejected-webhook", () =>
				sendZapierWebhook({
					leadId,
					workflowId,
					stage: 3,
					event: "APPLICATION_REJECTED",
					reason: agentEvent.data.decision.reason,
				}),
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
		await step.run("stage-4-processing", () =>
			updateWorkflowStatus(workflowId, "processing", 4),
		);

		await step.run("stage-4-complete", () =>
			updateWorkflowStatus(workflowId, "completed", 4),
		);

		await step.run("stage-4-complete-webhook", () =>
			sendZapierWebhook({
				leadId,
				workflowId,
				stage: 4,
				event: "ONBOARDING_COMPLETE",
			}),
		);

		console.log("[Workflow] COMPLETED successfully!");
		return { status: "completed", stage: 4 };
	},
);
