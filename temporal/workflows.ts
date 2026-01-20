import {
	proxyActivities,
	defineSignal,
	setHandler,
	condition,
	Trigger,
} from "@temporalio/workflow";
import type * as activities from "./activities";
import {
	qualityGatePassed,
	agentCallbackReceived,
	type QualityGatePayload,
	type AgentCallbackPayload,
} from "./signals";

const { sendZapierWebhook, updateDbStatus, generateQuote, aiRiskAnalysis } =
	proxyActivities<typeof activities>({
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
	console.log(
		`[Workflow] STARTED onboardingWorkflow for lead=${leadId} workflow=${workflowId}`,
	);
	// Workflow State
	let qualityGateData: QualityGatePayload | null = null;
	let agentDecisionData: AgentCallbackPayload | null = null;

	// Signal Handlers
	setHandler(qualityGatePassed, (payload) => {
		qualityGateData = payload;
	});

	setHandler(agentCallbackReceived, (payload) => {
		agentDecisionData = payload;
	});

	// ==================================================================
	// Stage 1: Lead Capture & Commitment
	// ==================================================================
	await updateDbStatus(workflowId, "processing", 1);
	await sendZapierWebhook({
		leadId,
		stage: 1,
		event: "LEAD_CAPTURED",
		workflowId,
	});
	// In a real scenario, we might wait for the "Facility Application" to be signed here.
	// For this step, we assume the lead capture *is* the trigger.

	// ==================================================================
	// Stage 2: Dynamic Quotation & Quality Gating
	// ==================================================================
	await updateDbStatus(workflowId, "processing", 2);

	// 2.1 Generate Quote (Mock Engine)
	const quote = await generateQuote(leadId);
	await sendZapierWebhook({
		leadId,
		stage: 2,
		event: "QUOTATION_GENERATED",
		quote,
		workflowId,
	});

	// 2.2 Wait for Quality Gate (Human/System validates "Compulsory Fields")
	await updateDbStatus(workflowId, "awaiting_human", 2);

	console.log("[Workflow] Waiting for Quality Gate signal...");
	await condition(() => qualityGateData !== null);

	console.log("[Workflow] Quality Gate Passed!", qualityGateData);
	await updateDbStatus(workflowId, "processing", 2);

	// ==================================================================
	// Stage 3: Intelligent Verification & Agent Routing
	// ==================================================================
	await updateDbStatus(workflowId, "processing", 3);

	// 3.1 AI Pre-Screening
	const aiResult = await aiRiskAnalysis(leadId);

	// 3.2 Dispatch to Zapier Audit Agent
	await updateDbStatus(workflowId, "awaiting_human", 3); // Technically awaiting external agent
	await sendZapierWebhook({
		leadId,
		stage: 3,
		event: "RISK_VERIFICATION_REQUESTED",
		workflowId,
		aiResult,
		quote, // Pass quote context
	});

	// 3.3 Wait for External Agent/Human Decision
	console.log("[Workflow] Waiting for Agent Callback signal...");
	await condition(() => agentDecisionData !== null);

	console.log("[Workflow] Agent Callback Received!", agentDecisionData);

	// Logic Branching based on Decision
	const decisionResult = agentDecisionData!;
	if (decisionResult.decision?.outcome === "REJECTED") {
		await updateDbStatus(workflowId, "failed", 3);
		await sendZapierWebhook({
			leadId,
			stage: 3,
			event: "APPLICATION_REJECTED",
			reason: decisionResult.decision.reason,
			workflowId,
		});
		return; // End Workflow
	}

	// ==================================================================
	// Stage 4: Integration & Handover
	// ==================================================================
	await updateDbStatus(workflowId, "processing", 4);

	// Final Sync
	await updateDbStatus(workflowId, "completed", 4);
	await sendZapierWebhook({
		leadId,
		stage: 4,
		event: "ONBOARDING_COMPLETE",
		workflowId,
	});
}
