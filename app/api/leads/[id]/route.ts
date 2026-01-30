import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import {
	documents,
	formInstances,
	formInstanceSubmissions,
	leads,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateLeadSchema } from "@/lib/validations";

/**
 * PUT /api/leads/[id]
 * Update a lead by ID
 */
export async function PUT(
	request: NextRequest,
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

		// Await params in Next.js 15
		const resolvedParams = await params;
		const id = parseInt(resolvedParams.id);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const body = await request.json();

		const validation = updateLeadSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 },
			);
		}

		const data = validation.data;

		// Perform update
		const updatedLeadResults = await db
			.update(leads)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(leads.id, id))
			.returning();

		if (updatedLeadResults.length === 0) {
			return NextResponse.json({ error: "Lead not found" }, { status: 404 });
		}

		const updatedLead = updatedLeadResults[0];

		return NextResponse.json({ lead: updatedLead });
	} catch (error) {
		console.error("Error updating lead:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * GET /api/leads/[id]
 * Fetch lead with documents and form submissions
 */
export async function GET(
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
		const id = parseInt(resolvedParams.id);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const leadResults = await db.select().from(leads).where(eq(leads.id, id));
		const lead = leadResults[0];

		if (!lead) {
			return NextResponse.json({ error: "Lead not found" }, { status: 404 });
		}

		const [leadDocuments, submissions, instances] = await Promise.all([
			db.select().from(documents).where(eq(documents.leadId, id)),
			db
				.select()
				.from(formInstanceSubmissions)
				.where(eq(formInstanceSubmissions.leadId, id)),
			db.select().from(formInstances).where(eq(formInstances.leadId, id)),
		]);

		return NextResponse.json({
			lead,
			documents: leadDocuments,
			formInstanceSubmissions: submissions,
			formInstances: instances,
		});
	} catch (error) {
		console.error("Error fetching lead:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
