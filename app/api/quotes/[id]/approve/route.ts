import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest";

/**
 * POST /api/quotes/[id]/approve
 * Mark quote as approved by staff and notify workflow
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 },
			);
		}

		const resolvedParams = await params;
		const id = Number(resolvedParams.id);

		if (!Number.isFinite(id)) {
			return NextResponse.json({ error: "Invalid quote ID" }, { status: 400 });
		}

		const quoteResults = await db
			.select()
			.from(quotes)
			.where(eq(quotes.id, id));

		if (quoteResults.length === 0) {
			return NextResponse.json({ error: "Quote not found" }, { status: 404 });
		}

		const updatedQuoteResults = await db
			.update(quotes)
			.set({
				status: "pending_approval",
				updatedAt: new Date(),
			})
			.where(eq(quotes.id, id))
			.returning();

		const updatedQuote = updatedQuoteResults[0];
		let leadId = updatedQuote.leadId ?? null;

		if (!leadId) {
			const workflowResults = await db
				.select()
				.from(workflows)
				.where(eq(workflows.id, updatedQuote.workflowId));
			leadId = workflowResults[0]?.leadId ?? null;
		}

		if (!leadId) {
			return NextResponse.json(
				{ error: "Lead ID missing for quote approval" },
				{ status: 400 },
			);
		}

		await inngest.send({
			name: "quote/approved",
			data: {
				workflowId: updatedQuote.workflowId,
				leadId,
				quoteId: updatedQuote.id,
				approvedAt: new Date().toISOString(),
			},
		});

		return NextResponse.json({ quote: updatedQuote });
	} catch (error) {
		console.error("Error approving quote:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
