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
						console.log(
							`[Activity] Enriched payload with Lead data for ${leadId}`,
						);
					}
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

	// FAIL LOUDLY: No more silent skipping. If URL is not set, throw an error.
	if (!zapierUrl) {
		throw new Error(
			`[Activity] FATAL: No Zapier webhook URL configured for event "${event}". ` +
				`Set the appropriate WEBHOOK_ZAP_* environment variable.`,
		);
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

	const quoteServiceUrl = process.env.WEBHOOK_ZAP_QUOTE_GENERATION;

	// FAIL LOUDLY: No more mock data. Require a real quote service.
	if (!quoteServiceUrl) {
		throw new Error(
			`[Activity] FATAL: No quote generation service configured. ` +
				`Set WEBHOOK_ZAP_QUOTE_GENERATION environment variable.`,
		);
	}

	// Fetch lead data to send to quote generation service
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
			console.error("[Activity] Failed to fetch lead data for quote:", err);
			throw err;
		}
	}

	if (!leadData) {
		throw new Error(
			`[Activity] Lead ${leadId} not found for quote generation.`,
		);
	}

	const payload = {
		leadId,
		companyName: leadData.companyName,
		industry: leadData.industry,
		employeeCount: leadData.employeeCount,
		estimatedVolume: leadData.estimatedVolume,
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/quotes/callback`,
	};

	try {
		const response = await fetch(quoteServiceUrl, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			throw new Error(
				`Quote service failed with status ${response.status}: ${response.statusText}`,
			);
		}

		const result = await response.json();

		// Expect the quote service to return { quoteId, amount, terms }
		if (!result.quoteId || result.amount === undefined) {
			throw new Error(
				`[Activity] Quote service returned invalid response: ${JSON.stringify(result)}`,
			);
		}

		return {
			quoteId: result.quoteId,
			amount: result.amount,
			terms: result.terms || "Standard 30-day payment terms",
		};
	} catch (error) {
		console.error("[Activity] Error calling quote generation service:", error);
		throw error;
	}
}

export async function aiRiskAnalysis(leadId: number): Promise<{
	riskScore: number;
	anomalies: string[];
	recommendedAction: string;
}> {
	console.log(`[Activity] Performing AI Risk Analysis for Lead ${leadId}`);

	const aiServiceUrl = process.env.WEBHOOK_ZAP_AI_RISK_ANALYSIS;

	// FAIL LOUDLY: No more mock data. Require a real AI service.
	if (!aiServiceUrl) {
		throw new Error(
			`[Activity] FATAL: No AI risk analysis service configured. ` +
				`Set WEBHOOK_ZAP_AI_RISK_ANALYSIS environment variable.`,
		);
	}

	// Fetch lead data to send to AI service
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
			console.error(
				"[Activity] Failed to fetch lead data for AI analysis:",
				err,
			);
			throw err;
		}
	}

	if (!leadData) {
		throw new Error(
			`[Activity] Lead ${leadId} not found for AI risk analysis.`,
		);
	}

	const payload = {
		leadId,
		companyName: leadData.companyName,
		industry: leadData.industry,
		employeeCount: leadData.employeeCount,
		estimatedVolume: leadData.estimatedVolume,
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/risk-analysis/callback`,
	};

	try {
		const response = await fetch(aiServiceUrl, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			throw new Error(
				`AI risk analysis service failed with status ${response.status}: ${response.statusText}`,
			);
		}

		const result = await response.json();

		// Expect the AI service to return { riskScore, anomalies, recommendedAction }
		if (result.riskScore === undefined) {
			throw new Error(
				`[Activity] AI service returned invalid response: ${JSON.stringify(result)}`,
			);
		}

		return {
			riskScore: result.riskScore,
			anomalies: result.anomalies || [],
			recommendedAction: result.recommendedAction || "MANUAL_REVIEW",
		};
	} catch (error) {
		console.error("[Activity] Error calling AI risk analysis service:", error);
		throw error;
	}
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

// Phase 2: Platform Integration & Escalation

export async function dispatchToPlatform(payload: {
	leadId: number;
	workflowId: number;
	clientName?: string;
	riskScore: number;
	anomalies: string[];
	documentLinks?: string[];
}): Promise<void> {
	console.log(
		`[Activity] Dispatching to Platform for Workflow ${payload.workflowId}`,
	);

	let clientName = payload.clientName || "Unknown Client";

	// Fetch Clean Name if not provided
	if (!payload.clientName && payload.leadId) {
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
				console.error("[Activity] Failed to fetch lead data:", err);
			}
		}
	}

	const webhookUrl = process.env.WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER;

	// FAIL LOUDLY: No more silent skipping.
	if (!webhookUrl) {
		throw new Error(
			`[Activity] FATAL: WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER not configured. ` +
				`Cannot dispatch to platform without this webhook URL.`,
		);
	}

	// Strict JSON Structure as per plan
	const outboundPayload = {
		eventId: `evt_${Date.now()}`,
		workflowId: `onboarding_${payload.workflowId}`,
		taskType: "RISK_VERIFICATION",
		payload: {
			clientName: payload.clientName,
			riskScore: payload.riskScore,
			anomalies: payload.anomalies,
			documentLinks: payload.documentLinks || [],
		},
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflows/${payload.workflowId}/signal`,
	};

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			body: JSON.stringify(outboundPayload),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			throw new Error(`Platform dispatch failed: ${response.statusText}`);
		}
		console.log("[Activity] Successfully dispatched to Platform");
	} catch (error) {
		console.error("[Activity] Error dispatching to Platform:", error);
		throw error;
	}
}

export async function escalateToManagement(payload: {
	workflowId: number;
	leadId: number;
	reason: string;
}): Promise<void> {
	console.warn(
		`[Activity] ESCALATING Workflow ${payload.workflowId} due to: ${payload.reason}`,
	);

	const escalationUrl = process.env.WEBHOOK_ZAP_ESCALATION_TRIGGER;

	// FAIL LOUDLY: No more silent skipping for escalations.
	if (!escalationUrl) {
		throw new Error(
			`[Activity] FATAL: WEBHOOK_ZAP_ESCALATION_TRIGGER not configured. ` +
				`Cannot escalate workflow without this webhook URL.`,
		);
	}

	try {
		const response = await fetch(escalationUrl, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			throw new Error(
				`Escalation webhook failed with status ${response.status}: ${response.statusText}`,
			);
		}
		console.log("[Activity] Successfully sent escalation webhook");
	} catch (error) {
		console.error("[Activity] Failed to send escalation webhook:", error);
		throw error;
	}
}
