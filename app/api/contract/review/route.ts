/**
 * Contract Draft Review API — SOP Stage 5
 *
 * Allows the Account Manager to review/edit the AI-generated contract draft
 * and mark it as reviewed. Emits 'contract/draft.reviewed' to advance workflow.
 *
 * POST /api/contract/review
 * Body: { workflowId, applicantId, changes? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

const ContractReviewSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	changes: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const validationResult = ContractReviewSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, changes } = validationResult.data;

		console.log(`[ContractReview] Processing contract review for workflow ${workflowId}`);

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Verify workflow exists
		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		if (workflowResult.length === 0) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		// Log the contract review event
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "contract_draft_reviewed",
			payload: JSON.stringify({
				reviewedBy: userId,
				changes: changes || {},
				reviewedAt: new Date().toISOString(),
			}),
			actorId: userId,
			actorType: "user",
		});

		// Emit Inngest event to advance workflow
		await inngest.send({
			name: "contract/draft.reviewed",
			data: {
				workflowId,
				applicantId,
				reviewedBy: userId,
				reviewedAt: new Date().toISOString(),
				changes: changes || {},
			},
		});

		return NextResponse.json({
			success: true,
			message: "Contract draft reviewed — proceeding to send to client",
			workflowId,
			applicantId,
			reviewedBy: userId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[ContractReview] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
