/**
 * Notification service - webhook and communication operations
 */
import { getDatabaseClient } from "@/app/utils";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

export type WebhookEvent =
	| "LEAD_CAPTURED"
	| "QUOTATION_GENERATED"
	| "RISK_VERIFICATION_REQUESTED"
	| "APPLICATION_REJECTED"
	| "ONBOARDING_COMPLETE";

export interface WebhookPayload {
	leadId: number;
	workflowId: number;
	stage: number;
	event: WebhookEvent;
	[key: string]: unknown;
}

/**
 * Send webhook to Zapier with enriched lead data
 */
export async function sendZapierWebhook(
	payload: WebhookPayload,
): Promise<void> {
	let finalPayload = { ...payload };
	const { leadId, stage, event } = payload;

	// Enrich payload with Lead data
	if (leadId) {
		const db = getDatabaseClient();
		if (db) {
			try {
				const leadResults = await db
					.select()
					.from(leads)
					.where(eq(leads.id, leadId));
				if (leadResults.length > 0) {
					const leadData = leadResults[0];
					if (leadData) {
						finalPayload = {
							...finalPayload,
							companyName: leadData.companyName,
							contactName: leadData.contactName,
							email: leadData.email,
							phone: leadData.phone,
							industry: leadData.industry,
							employeeCount: leadData.employeeCount,
							estimatedVolume: leadData.estimatedVolume,
							leadNotes: leadData.notes,
						};
					}
				}
			} catch (err) {
				console.error("[NotificationService] Failed to fetch lead data:", err);
			}
		}
	}

	console.log(
		`[NotificationService] Sending Zapier Webhook: Lead ${leadId}, Stage ${stage}, Event: ${event}`,
	);

	const zapierUrl = getWebhookUrl(event);

	if (!zapierUrl) {
		throw new Error(
			`[NotificationService] No webhook URL configured for event "${event}"`,
		);
	}

	const response = await fetch(zapierUrl, {
		method: "POST",
		body: JSON.stringify(finalPayload),
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		throw new Error(
			`Zapier webhook failed: ${response.status} ${response.statusText}`,
		);
	}
}

/**
 * Get the appropriate webhook URL for an event type
 */
function getWebhookUrl(event: WebhookEvent): string | undefined {
	switch (event) {
		case "LEAD_CAPTURED":
			return process.env.WEBHOOK_ZAP_MANDATE_KICKOFF_TRIGGER;
		case "QUOTATION_GENERATED":
			return process.env.WEBHOOK_ZAP_QUOTATION_TRIGGER;
		case "RISK_VERIFICATION_REQUESTED":
			return process.env.WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER;
		case "ONBOARDING_COMPLETE":
			return process.env.WEBHOOK_ZAP_ONBOARDING_COMPLETE_TRIGGER;
		default:
			return process.env.ZAPIER_CATCH_HOOK_URL;
	}
}

export interface DispatchPayload {
	leadId: number;
	workflowId: number;
	riskScore: number;
	anomalies: string[];
	documentLinks?: string[];
}

/**
 * Dispatch to external platform for agent review
 */
export async function dispatchToPlatform(
	payload: DispatchPayload,
): Promise<void> {
	console.log(
		`[NotificationService] Dispatching to Platform: Workflow ${payload.workflowId}`,
	);

	let clientName = "Unknown Client";

	// Fetch client name
	if (payload.leadId) {
		const db = getDatabaseClient();
		if (db) {
			try {
				const leadResults = await db
					.select()
					.from(leads)
					.where(eq(leads.id, payload.leadId));
				if (leadResults.length > 0 && leadResults[0]) {
					clientName = leadResults[0].companyName;
				}
			} catch (err) {
				console.error("[NotificationService] Failed to fetch lead:", err);
			}
		}
	}

	const webhookUrl = process.env.WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER;
	if (!webhookUrl) {
		throw new Error(
			"[NotificationService] WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER not configured",
		);
	}

	const outboundPayload = {
		eventId: `evt_${Date.now()}`,
		workflowId: `onboarding_${payload.workflowId}`,
		taskType: "RISK_VERIFICATION",
		payload: {
			clientName,
			riskScore: payload.riskScore,
			anomalies: payload.anomalies,
			documentLinks: payload.documentLinks || [],
		},
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflows/${payload.workflowId}/signal`,
	};

	const response = await fetch(webhookUrl, {
		method: "POST",
		body: JSON.stringify(outboundPayload),
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		throw new Error(`Platform dispatch failed: ${response.statusText}`);
	}
}

export interface EscalationPayload {
	workflowId: number;
	leadId: number;
	reason: string;
}

/**
 * Escalate workflow to management
 */
export async function escalateToManagement(
	payload: EscalationPayload,
): Promise<void> {
	console.warn(
		`[NotificationService] ESCALATING Workflow ${payload.workflowId}: ${payload.reason}`,
	);

	const escalationUrl = process.env.WEBHOOK_ZAP_ESCALATION_TRIGGER;
	if (!escalationUrl) {
		throw new Error(
			"[NotificationService] WEBHOOK_ZAP_ESCALATION_TRIGGER not configured",
		);
	}

	const response = await fetch(escalationUrl, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		throw new Error(
			`Escalation webhook failed: ${response.status} ${response.statusText}`,
		);
	}
}
