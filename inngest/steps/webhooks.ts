/**
 * Reusable step helpers for webhook operations
 * Use these in workflow functions for consistent webhook dispatch
 */
import {
	sendZapierWebhook,
	type WebhookEvent,
} from "@/lib/services/notification.service";

export interface WebhookPayload {
	leadId: number;
	workflowId: number;
	stage: number;
	event: WebhookEvent;
	[key: string]: unknown;
}

/**
 * Creates a step configuration for sending webhooks
 * @example
 * await step.run(webhookSteps.send({ leadId, workflowId, stage: 1, event: "LEAD_CAPTURED" }));
 */
export const webhookSteps = {
	send: (payload: WebhookPayload) => ({
		id: `webhook-stage${payload.stage}-${payload.event.toLowerCase()}`,
		fn: () => sendZapierWebhook(payload),
	}),
};
