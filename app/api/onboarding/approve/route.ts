/**
 * Final Approval API - Control Tower Endpoint
 *
 * Allows the Account Manager to finalize an application after
 * all documents and contracts are received. Sends 'onboarding/final-approval.received'
 * event to complete the V2 workflow.
 *
 * POST /api/onboarding/approve
 * Body: { workflowId, applicantId, contractSigned, absaFormComplete, notes? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents, applicants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// ============================================
// Request Schema
// ============================================

const FinalApprovalSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	contractSigned: z.boolean(),
	absaFormComplete: z.boolean(),
	notes: z.string().optional(),
});

type FinalApprovalInput = z.infer<typeof FinalApprovalSchema>;

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
	try {
		// Authenticate the request
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
		}

		// Parse and validate request body
		const body = await request.json();
		const validationResult = FinalApprovalSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, contractSigned, absaFormComplete, notes } =
			validationResult.data;

		console.log(`[FinalApproval] Processing final approval for workflow ${workflowId}:`, {
			approvedBy: userId,
			contractSigned,
			absaFormComplete,
		});

		// Verify prerequisites
		if (!contractSigned) {
			return NextResponse.json(
				{ error: "Contract must be signed before final approval" },
				{ status: 400 }
			);
		}

		// Verify workflow exists and is in correct state
		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		const workflow = workflowResult[0];
		if (!workflow) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		// Verify applicant exists
		const applicantResult = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));

		if (applicantResult.length === 0) {
			return NextResponse.json(
				{ error: `Applicant ${applicantId} not found` },
				{ status: 404 }
			);
		}

		// Log the approval event to the database
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "final_approval",
			payload: JSON.stringify({
				contractSigned,
				absaFormComplete,
				notes,
				fromStage: workflow.stage,
			}),
			actorId: userId,
			actorType: "user",
		});

		// Send the event to Inngest to complete the workflow
		await inngest.send({
			name: "onboarding/final-approval.received",
			data: {
				workflowId,
				applicantId,
				approvedBy: userId,
				contractSigned,
				absaFormComplete,
				notes,
				timestamp: new Date().toISOString(),
			},
		});

		console.log(`[FinalApproval] Event sent to Inngest for workflow ${workflowId}`);

		// Return success response
		return NextResponse.json({
			success: true,
			message: "Final approval recorded - workflow completing",
			workflowId,
			applicantId,
			approvedBy: userId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[FinalApproval] Error processing approval:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

// ============================================
// GET Handler - Get approval status
// ============================================

export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const workflowId = searchParams.get("workflowId");

		if (!workflowId) {
			return NextResponse.json(
				{ error: "workflowId query parameter is required" },
				{ status: 400 }
			);
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, parseInt(workflowId)));

		const workflow = workflowResult[0];
		if (!workflow) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		// Check if workflow is ready for final approval
		const isReadyForApproval =
			workflow.status === "awaiting_human" && (workflow.stage === 5 || workflow.stage === 6);

		return NextResponse.json({
			workflowId: workflow.id,
			applicantId: workflow.applicantId,
			status: workflow.status,
			stage: workflow.stage,
			isReadyForApproval,
		});
	} catch (error) {
		console.error("[FinalApproval] Error fetching status:", error);

		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
