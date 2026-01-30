/**
 * Risk service - AI risk analysis operations
 */
import { getDatabaseClient } from "@/app/utils";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface RiskResult {
	riskScore: number;
	anomalies: string[];
	recommendedAction: string;
}

/**
 * Perform AI risk analysis for a lead
 */
export async function analyzeRisk(leadId: number): Promise<RiskResult> {
	console.log(`[RiskService] Performing AI Risk Analysis for Lead ${leadId}`);

	const aiServiceUrl = process.env.WEBHOOK_ZAP_AI_RISK_ANALYSIS;
	if (!aiServiceUrl) {
		throw new Error(
			"[RiskService] WEBHOOK_ZAP_AI_RISK_ANALYSIS not configured",
		);
	}

	// Fetch lead data
	const db = getDatabaseClient();
	let leadData = null;
	if (db) {
		try {
			const leadResults = await db
				.select()
				.from(leads)
				.where(eq(leads.id, leadId));
			if (leadResults.length > 0) {
				leadData = leadResults[0];
			}
		} catch (err) {
			console.error("[RiskService] Failed to fetch lead:", err);
			throw err;
		}
	}

	if (!leadData) {
		throw new Error(`[RiskService] Lead ${leadId} not found`);
	}

	const payload = {
		leadId,
		companyName: leadData.companyName,
		industry: leadData.industry,
		employeeCount: leadData.employeeCount,
		estimatedVolume: leadData.mandateVolume,
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/risk-analysis/callback`,
	};

	const response = await fetch(aiServiceUrl, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		throw new Error(
			`AI risk service failed: ${response.status} ${response.statusText}`,
		);
	}

	const result = await response.json();

	if (result.riskScore === undefined) {
		throw new Error(
			`[RiskService] Invalid response: ${JSON.stringify(result)}`,
		);
	}

	return {
		riskScore: result.riskScore,
		anomalies: result.anomalies || [],
		recommendedAction: result.recommendedAction || "MANUAL_REVIEW",
	};
}
