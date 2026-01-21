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
	async?: boolean;
}

/**
 * Generate a quote for a lead using external quote service
 */
export async function generateQuote(
	leadId: number,
	workflowId: number,
): Promise<QuoteResult> {
	console.log(
		`[QuoteService] Generating Quote for Lead ${leadId}, Workflow ${workflowId}`,
	);

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
		workflowId,
		companyName: leadData.companyName,
		industry: leadData.industry,
		employeeCount: leadData.employeeCount,
		estimatedVolume: leadData.estimatedVolume,
		callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/callbacks/quotes`,
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
				error: `external Webhook Failed: ${response.status} ${response.statusText}`,
				recoverable: true,
			};
		}

		// We don't wait for the quote data anymore, we assume it's async.
		// Even if external returns something, we ignore it unless it's an error.

		return {
			success: true,
			async: true,
		};
	} catch (error) {
		return {
			success: false,
			error: `Network Error: ${error instanceof Error ? error.message : String(error)}`,
			recoverable: true,
		};
	}
}
