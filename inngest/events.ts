import { type EventSchemas } from "inngest";
import type { WorkflowStatus } from "@/inngest/steps/database";

export type Events = {
	"onboarding/started": {
		data: {
			leadId: number;
			workflowId: number;
		};
	};
	"onboarding/quality-gate-passed": {
		data: {
			workflowId: number;
			approverId: string;
			timestamp: string;
		};
	};
	"onboarding/agent-callback": {
		data: {
			workflowId: number;
			decision: {
				agentId: string;
				outcome: "APPROVED" | "REJECTED";
				reason?: string;
				timestamp: string;
			};
		};
	};
	"onboarding/timeout-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			decision?: {
				agentId: string;
				outcome: "APPROVED" | "REJECTED";
				reason?: string;
				timestamp: string;
			};
		};
	};
	"workflow/error-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			resolvedBy?: string; // User ID
		};
	};
};
