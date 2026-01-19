import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { leads } from "@/db/schema";
import { createLeadSchema } from "@/lib/validations";

/**
 * GET /api/leads
 * List all leads with optional pagination
 */
export async function GET() {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 },
			);
		}

		const allLeads = await db.select().from(leads).orderBy(leads.createdAt);

		return NextResponse.json({ leads: allLeads });
	} catch (error) {
		console.error("Error fetching leads:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * POST /api/leads
 * Create a new lead
 */
export async function POST(request: NextRequest) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 },
			);
		}

		const body = await request.json();

		// Validate input with Zod
		const validation = createLeadSchema.safeParse(body);

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

		// Insert the new lead - using ALL fields including optional ones
		const newLeadResults = await db
			.insert(leads)
			.values({
				companyName: data.companyName,
				contactName: data.contactName,
				email: data.email,
				phone: data.phone,
				industry: data.industry,
				employeeCount: data.employeeCount,
				estimatedVolume: data.estimatedVolume,
				notes: data.notes,
				status: "new",
			})
			.returning();

		const newLead = newLeadResults[0];

		return NextResponse.json({ lead: newLead }, { status: 201 });
	} catch (error) {
		console.error("Error creating lead:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
