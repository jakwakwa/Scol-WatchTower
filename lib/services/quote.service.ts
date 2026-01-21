/**
 * Quote service - quote generation operations
 */
import { getDatabaseClient } from "@/app/utils";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface Quote {
	quoteId: string;
	amount: number;
	terms: string;
}

/**
 * Generate a quote for a lead using external quote service
 */
export async function generateQuote(leadId: number): Promise<Quote> {
	console.log(`[QuoteService] Generating Quote for Lead ${leadId}`);

	const quoteServiceUrl = process.env.WEBHOOK_ZAP_QUOTE_GENERATION;
	if (!quoteServiceUrl) {
		throw new Error(
			"[QuoteService] WEBHOOK_ZAP_QUOTE_GENERATION not configured",
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
			console.error("[QuoteService] Failed to fetch lead:", err);
			throw err;
		}
	}

	if (!leadData) {
		throw new Error(`[QuoteService] Lead ${leadId} not found`);
	}

	const payload = {
		leadId,
		companyName: leadData.companyName,
		industry: leadData.industry,
		employeeCount: leadData.employeeCount,
		estimatedVolume: leadData.estimatedVolume,
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/quotes/callback`,
	};

	const response = await fetch(quoteServiceUrl, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		throw new Error(
			`Quote service failed: ${response.status} ${response.statusText}`,
		);
	}

	const result = await response.json();

	if (!result.quoteId || result.amount === undefined) {
		throw new Error(
			`[QuoteService] Invalid response: ${JSON.stringify(result)}`,
		);
	}

	return {
		quoteId: result.quoteId,
		amount: result.amount,
		terms: result.terms || "Standard 30-day payment terms",
	};
}
