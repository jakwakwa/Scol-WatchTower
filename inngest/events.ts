/**
 * Typed event definitions for Inngest workflows
 * Add new events here to enable type-safe triggering and waiting
 */

/** Decision from external agent callback */
export interface AgentDecision {
	agentId: string;
	outcome: "APPROVED" | "REJECTED";
	reason?: string;
	timestamp: string;
}

/** Quality gate validation result */
export interface QualityGatePayload {
	payload: Record<string, unknown>;
	passedAt: string;
}

/** All events used across workflows */
export type Events = {
	/** Triggers the onboarding workflow */
	"onboarding/started": {
		data: {
			leadId: number;
			workflowId: number;
		};
	};

	/** Signal: quality gate validation passed */
	"onboarding/quality-gate-passed": {
		data: {
			workflowId: number;
			payload: QualityGatePayload;
		};
	};

	/** Signal: external agent decision received */
	"onboarding/agent-callback": {
		data: {
			workflowId: number;
			decision: AgentDecision;
		};
	};

	/** Signal: human resolved a timeout (retry/cancel/continue) */
	"onboarding/timeout-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			decision?: AgentDecision;
		};
	};
};
