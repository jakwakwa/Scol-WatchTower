import { getDatabaseClient } from "@/app/utils";
import { leads, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function sendZapierWebhook(payload: any): Promise<void> {
	let finalPayload = { ...payload };
	const { leadId, stage, event } = payload;

	// Enrich payload with Lead data if leadId exists
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
					console.log(
						`[Activity] Enriched payload with Lead data for ${leadId}`,
					);
				}
			} catch (err) {
				console.error(
					"[Activity] Failed to fetch lead data for enrichment:",
					err,
				);
			}
		}
	}

	console.log(
		`[Activity] Sending Zapier Webhook for Lead ${leadId} at Stage ${stage} (Event: ${event})`,
	);

	let zapierUrl = process.env.ZAPIER_CATCH_HOOK_URL;

	// Determine which webhook URL to use based on the event
	switch (event) {
		case "LEAD_CAPTURED":
			if (process.env.WEBHOOK_ZAP_MANDATE_KICKOFF_TRIGGER) {
				zapierUrl = process.env.WEBHOOK_ZAP_MANDATE_KICKOFF_TRIGGER;
				console.log("[Activity] Using WEBHOOK_ZAP_MANDATE_KICKOFF_TRIGGER");
			}
			break;
		case "QUOTATION_GENERATED":
			if (process.env.WEBHOOK_ZAP_QUOTATION_TRIGGER) {
				zapierUrl = process.env.WEBHOOK_ZAP_QUOTATION_TRIGGER;
				console.log("[Activity] Using WEBHOOK_ZAP_QUOTATION_TRIGGER");
			}
			break;
		case "RISK_VERIFICATION_REQUESTED":
			if (process.env.WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER) {
				zapierUrl = process.env.WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER;
				console.log("[Activity] Using WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER");
			}
			break;
		case "ONBOARDING_COMPLETE":
			if (process.env.WEBHOOK_ZAP_ONBOARDING_COMPLETE_TRIGGER) {
				zapierUrl = process.env.WEBHOOK_ZAP_ONBOARDING_COMPLETE_TRIGGER;
				console.log("[Activity] Using WEBHOOK_ZAP_ONBOARDING_COMPLETE_TRIGGER");
			}
			break;
		default:
			// Fallback to generic hook is handled by initial assignment
			break;
	}

	// For development/mocking, if no URL is set, we just log and return.
	if (!zapierUrl) {
		console.warn(
			`[Activity] No Zapier webhook URL set (Event: ${event}). Skipping real fetch.`,
		);
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return;
	}

	try {
		const response = await fetch(zapierUrl, {
			method: "POST",
			body: JSON.stringify(finalPayload),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			throw new Error(
				`Zapier webhook failed with status ${response.status}: ${response.statusText}`,
			);
		}
	} catch (error) {
		console.error("[Activity] Error sending Zapier webhook:", error);
		// Rethrow to let Temporal handle retries
		throw error;
	}
}

export async function generateQuote(
	leadId: number,
): Promise<{ quoteId: string; amount: number; terms: string }> {
	console.log(`[Activity] Generating Dynamic Quote for Lead ${leadId}`);

	// Simulate complex calculation engine
	await new Promise((resolve) => setTimeout(resolve, 2000));

	// Mock response
	return {
		quoteId: `Q-${Date.now()}`,
		amount: Math.floor(Math.random() * 1000000) + 50000, // Random amount between 50k and 1M
		terms: "Standard 30-day payment terms",
	};
}

export async function aiRiskAnalysis(leadId: number): Promise<{
	riskScore: number;
	anomalies: string[];
	recommendedAction: string;
}> {
	console.log(`[Activity] Performing AI Risk Analysis for Lead ${leadId}`);

	// Simulate AI processing time
	await new Promise((resolve) => setTimeout(resolve, 3000));

	// Mock data - in reality this would call Google Cloud Document AI or similar
	const riskScore = Math.floor(Math.random() * 100);
	let recommendedAction = "APPROVE";
	const anomalies: string[] = [];

	if (riskScore > 80) {
		recommendedAction = "REJECT";
		anomalies.push("High fraud probability detected");
		anomalies.push("Inconsistent font usage in bank statement");
	} else if (riskScore > 50) {
		recommendedAction = "MANUAL_REVIEW";
		anomalies.push("Suspicious transaction volume");
	}

	return {
		riskScore,
		anomalies,
		recommendedAction,
	};
}

export async function updateDbStatus(
	workflowId: number,
	status: string,
	stage: number,
): Promise<void> {
	console.log(
		`[Activity] Updating DB for Workflow ${workflowId}: Status=${status}, Stage=${stage}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Failed to get database client in activity");
	}

	await db
		.update(workflows)
		.set({
			status: status as any,
			stage,
		})
		.where(eq(workflows.id, workflowId));
}
