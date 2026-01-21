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
export interface QuoteResult {
	success: boolean;
	quote?: Quote;
	error?: string;
	recoverable?: boolean;
}

/**
 * Generate a quote for a lead using external quote service
 */
export async function generateQuote(leadId: number): Promise<QuoteResult> {
	console.log(`[QuoteService] Generating Quote for Lead ${leadId}`);

	const quoteServiceUrl = process.env.WEBHOOK_ZAP_QUOTE_GENERATION;
	if (!quoteServiceUrl) {
		console.error("[QuoteService] WEBHOOK_ZAP_QUOTE_GENERATION not configured");
		return {
			success: false,
			error: "Configuration Error: WEBHOOK_ZAP_QUOTE_GENERATION missing",
			recoverable: true,
		};
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
			return {
				success: false,
				error: `Database Error: ${err instanceof Error ? err.message : String(err)}`,
				recoverable: true,
			};
		}
	}

	if (!leadData) {
		return {
			success: false,
			error: `Lead ${leadId} not found`,
			recoverable: false,
		};
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
			return {
				success: false,
				error: `Zapier Webhook Failed: ${response.status} ${response.statusText}`,
				recoverable: true,
			};
		}

		const result = await response.json();

		if (!result.quoteId || result.amount === undefined) {
			return {
				success: false,
				error: `Invalid Quote Response: ${JSON.stringify(result)}`,
				recoverable: false,
			};
		}

		return {
			success: true,
			quote: {
				quoteId: result.quoteId,
				amount: result.amount,
				terms: result.terms || "Standard 30-day payment terms",
			},
		};
	} catch (error) {
		return {
			success: false,
			error: `Network Error: ${error instanceof Error ? error.message : String(error)}`,
			recoverable: true,
		};
	}
}
