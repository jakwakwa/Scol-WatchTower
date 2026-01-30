/**
 * Risk service - AI risk analysis operations
 */
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface RiskResult {
	riskScore: number;
	anomalies: string[];
	recommendedAction: string;
}

/**
 * Perform AI risk analysis for an applicant
 */
export async function analyzeRisk(applicantId: number): Promise<RiskResult> {
	console.log(
		`[RiskService] Performing AI Risk Analysis for Applicant ${applicantId}`,
	);

	const aiServiceUrl = process.env.WEBHOOK_ZAP_AI_RISK_ANALYSIS;
	if (!aiServiceUrl) {
		throw new Error(
			"[RiskService] WEBHOOK_ZAP_AI_RISK_ANALYSIS not configured",
		);
	}

	// Fetch applicant data
	const db = getDatabaseClient();
	let applicantData = null;
	if (db) {
		try {
			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			if (applicantResults.length > 0) {
				applicantData = applicantResults[0];
			}
		} catch (err) {
			console.error("[RiskService] Failed to fetch applicant:", err);
			throw err;
		}
	}

	if (!applicantData) {
		throw new Error(`[RiskService] Applicant ${applicantId} not found`);
	}

	const payload = {
		applicantId,
		companyName: applicantData.companyName,
		industry: applicantData.industry,
		employeeCount: applicantData.employeeCount,
		estimatedVolume: applicantData.mandateVolume,
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
