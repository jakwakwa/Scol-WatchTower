import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function sendZapierWebhook(payload: any): Promise<void> {
	const { leadId, stage, event } = payload;
	console.log(
		`[Activity] Sending Zapier Webhook for Lead ${leadId} at Stage ${stage} (Event: ${event})`,
	);

	const zapierUrl = process.env.ZAPIER_CATCH_HOOK_URL;

	// For development/mocking, if no URL is set, we just log and return.
	if (!zapierUrl) {
		console.warn(
			"[Activity] ZAPIER_CATCH_HOOK_URL not set. Skipping real fetch.",
		);
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return;
	}

	try {
		const response = await fetch(zapierUrl, {
			method: "POST",
			body: JSON.stringify(payload),
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

export async function aiRiskAnalysis(
	leadId: number,
): Promise<{
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
