/**
 * Quote service - quote generation operations
 */
import { generateObject } from "ai";
import { getDatabaseClient } from "@/app/utils";
import { leads, quotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getThinkingModel, isAIConfigured, AI_CONFIG } from "@/lib/ai/models";
import { quoteGenerationSchema } from "@/lib/validations/quotes";
import type { QuoteGenerationResult } from "@/lib/validations/quotes";

type LeadRow = typeof leads.$inferSelect;

export interface Quote {
	quoteId: string;
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent?: number | null;
	rationale?: string | null;
	details?: string | null;
	terms?: string;
}

/**
 * Generate a quote for a lead using external quote service
 */
export interface QuoteResult {
	success: boolean;
	quote?: Quote;
	error?: string;
	recoverable?: boolean;
	async?: boolean;
}

/**
 * Generate a quote for a lead using internal Gemini AI
 */
export async function generateQuote(
	leadId: number,
	workflowId: number,
): Promise<QuoteResult> {
	console.log(
		`[QuoteService] Generating Quote for Lead ${leadId}, Workflow ${workflowId}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		return {
			success: false,
			error: "Database connection failed",
			recoverable: true,
		};
	}

	let leadData: LeadRow | null = null;
	try {
		const leadResults = await db
			.select()
			.from(leads)
			.where(eq(leads.id, leadId));
		if (leadResults.length > 0) {
			leadData = leadResults[0];
		}
	} catch (err) {
		console.error("[QuoteService] Failed to fetch lead:", err);
		return {
			success: false,
			error: `Database Error: ${err instanceof Error ? err.message : String(err)}`,
			recoverable: true,
		};
	}

	if (!leadData) {
		return {
			success: false,
			error: `Lead ${leadId} not found`,
			recoverable: false,
		};
	}

	try {
		const quoteDetails = await generateQuoteWithAI(leadData, workflowId);
		const detailsJson = JSON.stringify({
			riskFactors: quoteDetails.riskFactors,
			recommendation: quoteDetails.recommendation,
			source: "gemini",
			generatedAt: new Date().toISOString(),
		});

		const quoteResults = await db
			.insert(quotes)
			.values({
				workflowId,
				leadId,
				amount: quoteDetails.amount,
				baseFeePercent: quoteDetails.baseFeePercent,
				adjustedFeePercent: quoteDetails.adjustedFeePercent,
				rationale: quoteDetails.rationale,
				details: detailsJson,
				generatedBy: "gemini",
				status: "draft",
			})
			.returning();

		const createdQuote = quoteResults[0];
		const quote: Quote = {
			quoteId: String(createdQuote.id),
			amount: createdQuote.amount,
			baseFeePercent: createdQuote.baseFeePercent,
			adjustedFeePercent: createdQuote.adjustedFeePercent ?? null,
			rationale: createdQuote.rationale ?? null,
			details: createdQuote.details ?? null,
			terms: "Standard terms",
		};

		await notifyQuoteGenerated({
			leadId,
			workflowId,
			companyName: leadData.companyName,
			quote,
		});

		return {
			success: true,
			quote,
		};
	} catch (error) {
		console.error("[QuoteService] Quote generation failed:", error);
		return {
			success: false,
			error: `Quote Generation Error: ${error instanceof Error ? error.message : String(error)}`,
			recoverable: true,
		};
	}
}

async function generateQuoteWithAI(
	leadData: LeadRow,
	workflowId: number,
): Promise<QuoteGenerationResult> {
	console.log(
		`[QuoteService] Running AI quote generation for workflow ${workflowId}`,
	);
	const prompt = `You are a pricing analyst generating a merchant services quote for StratCol.

LEAD DETAILS:
- Company: ${leadData.companyName}
- Industry: ${leadData.industry || "Not provided"}
- Employee count: ${leadData.employeeCount ?? "Not provided"}
- Mandate volume (cents): ${leadData.mandateVolume ?? "Not provided"}
- ITC score: ${leadData.itcScore ?? "Not provided"}
- Mandate type: ${leadData.mandateType ?? "Not provided"}

OUTPUT REQUIREMENTS:
- amount: integer in cents (ZAR)
- baseFeePercent: basis points (e.g. 150 = 1.5%)
- adjustedFeePercent: basis points (risk adjusted)
- rationale: 3-6 sentences explaining pricing logic
- riskFactors: list of short risk notes
- recommendation: STANDARD, PREMIUM, or HIGH_RISK

RULES:
- If mandate volume is missing, assume 5,000,000 cents (R50,000).
- Keep adjustedFeePercent within 50-500 bps.
- Use ITC score to adjust risk and pricing.`;

	if (isAIConfigured()) {
		try {
			const { object } = await generateObject({
				model: getThinkingModel(),
				schema: quoteGenerationSchema,
				schemaName: "QuoteGeneration",
				schemaDescription: "Generated pricing for StratCol merchant services",
				prompt,
				temperature: AI_CONFIG.ANALYSIS_TEMPERATURE,
			});

			return object;
		} catch (error) {
			console.error("[QuoteService] AI quote generation failed:", error);
		}
	}

	return generateMockQuote(leadData);
}

function generateMockQuote(leadData: LeadRow): QuoteGenerationResult {
	const mandateVolume = leadData.mandateVolume ?? 5_000_000;
	const baseFeePercent = 150;
	const itcScore = leadData.itcScore ?? 700;
	const riskAdjustment = itcScore < 650 ? 50 : itcScore < 700 ? 25 : 0;
	const adjustedFeePercent = Math.min(baseFeePercent + riskAdjustment, 500);

	return {
		amount: mandateVolume,
		baseFeePercent,
		adjustedFeePercent,
		rationale:
			"Pricing is based on the stated mandate volume and industry norms. A base fee of 1.5% is applied with a modest risk adjustment based on credit profile. The final rate reflects expected processing volume and compliance overhead.",
		riskFactors:
			itcScore < 650 ? ["Lower ITC score indicates elevated credit risk."] : [],
		recommendation: itcScore < 650 ? "HIGH_RISK" : "STANDARD",
	};
}

async function notifyQuoteGenerated({
	leadId,
	workflowId,
	companyName,
	quote,
}: {
	leadId: number;
	workflowId: number;
	companyName: string;
	quote: Quote;
}) {
	const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/callbacks/quotes`;

	try {
		const response = await fetch(callbackUrl, {
			method: "POST",
			body: JSON.stringify({
				leadId,
				workflowId,
				companyName,
				quoteId: quote.quoteId,
				amount: quote.amount,
				terms: quote.terms || "Standard terms",
			}),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			console.warn(
				"[QuoteService] Callback returned non-200:",
				response.status,
				response.statusText,
			);
		}
	} catch (error) {
		console.warn("[QuoteService] Failed to call quote callback:", error);
	}
}
