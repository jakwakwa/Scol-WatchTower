import { defineSignal } from "@temporalio/workflow";

// Signal to indicate that the Facility Application data has passed the quality gate (Zod validation)
export interface QualityGatePayload {
	payload: any; // The validated application data
	passedAt: string; // ISO timestamp
}
export const qualityGatePassed =
	defineSignal<[QualityGatePayload]>("qualityGatePassed");

// Signal to receive a callback from an external agent (e.g., Zapier)
export interface AgentCallbackPayload {
	agentId: string;
	status: string;
	decision: any; // The structured decision from the agent
	timestamp: string;
}
export const agentCallbackReceived = defineSignal<[AgentCallbackPayload]>(
	"agentCallbackReceived",
);
