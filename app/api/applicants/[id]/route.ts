import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantMagiclinkForms,
	applicants,
	applicantSubmissions,
	documents,
	quotes,
	riskAssessments,
	workflows,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { updateApplicantSchema } from "@/lib/validations";

/**
 * PUT /api/applicants/[id]
 * Update an applicant by ID
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Await params in Next.js 15
		const resolvedParams = await params;
		const id = parseInt(resolvedParams.id);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const body = await request.json();

		const validation = updateApplicantSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const data = validation.data;

		// Perform update
		const updatedApplicantResults = await db
			.update(applicants)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(applicants.id, id))
			.returning();

		if (updatedApplicantResults.length === 0) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const updatedApplicant = updatedApplicantResults[0];

		return NextResponse.json({ applicant: updatedApplicant });
	} catch (error) {
		console.error("Error updating applicant:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * GET /api/applicants/[id]
 * Fetch applicant with documents and form submissions
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const id = parseInt(resolvedParams.id);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const applicantResults = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, id));
		const applicant = applicantResults[0];

		if (!applicant) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const [applicantDocuments, submissions, instances, riskAssessmentRows, workflowRows] =
			await Promise.all([
				db.select().from(documents).where(eq(documents.applicantId, id)),
				db
					.select()
					.from(applicantSubmissions)
					.where(eq(applicantSubmissions.applicantId, id)),
				db
					.select()
					.from(applicantMagiclinkForms)
					.where(eq(applicantMagiclinkForms.applicantId, id)),
				db.select().from(riskAssessments).where(eq(riskAssessments.applicantId, id)),
				db
					.select()
					.from(workflows)
					.where(eq(workflows.applicantId, id))
					.orderBy(desc(workflows.startedAt)),
			]);

		// Fetch quote for the most recent workflow if exists
		let quote = null;
		if (workflowRows.length > 0) {
			const latestWorkflow = workflowRows[0];
			const quoteRows = await db
				.select()
				.from(quotes)
				.where(eq(quotes.workflowId, latestWorkflow.id))
				.orderBy(desc(quotes.createdAt))
				.limit(1);
			quote = quoteRows[0] || null;
		}

		return NextResponse.json({
			applicant,
			documents: applicantDocuments,
			applicantSubmissions: submissions,
			applicantMagiclinkForms: instances,
			riskAssessment: riskAssessmentRows[0] || null,
			workflow: workflowRows[0] || null,
			quote,
		});
	} catch (error) {
		console.error("Error fetching applicant:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
