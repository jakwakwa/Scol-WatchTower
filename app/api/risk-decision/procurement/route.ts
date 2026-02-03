/**
 * Procurement Decision API - Control Tower Endpoint
 *
 * Allows the Risk Manager to clear or deny an applicant based on
 * procurement check results. Sends 'risk/procurement.completed' event
 * to resume the V2 workflow.
 *
 * POST /api/risk-decision/procurement
 * Body: { workflowId, applicantId, procureCheckResult, decision }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// ============================================
// Request Schema
// ============================================

const ProcurementDecisionSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	procureCheckResult: z.object({
		riskScore: z.number().min(0).max(100),
		anomalies: z.array(z.string()),
		recommendedAction: z.enum(["APPROVE", "MANUAL_REVIEW", "DECLINE"]),
		rawData: z.record(z.string(), z.unknown()).optional(),
	}),
	decision: z.object({
		outcome: z.enum(["CLEARED", "DENIED"]),
		reason: z.string().optional(),
	}),
});

type ProcurementDecisionInput = z.infer<typeof ProcurementDecisionSchema>;

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
		const validationResult = ProcurementDecisionSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, procureCheckResult, decision } = validationResult.data;

		console.log(`[ProcurementDecision] Processing decision for workflow ${workflowId}:`, {
			outcome: decision.outcome,
			decidedBy: userId,
			riskScore: procureCheckResult.riskScore,
		});

		// Verify workflow exists
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

		// Log the decision event to the database
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "procurement_decision",
			payload: JSON.stringify({
				decision: decision.outcome,
				reason: decision.reason,
				riskScore: procureCheckResult.riskScore,
				anomalies: procureCheckResult.anomalies,
				fromStage: workflow.stage,
			}),
			actorId: userId,
			actorType: "user",
		});

		// Send the event to Inngest to resume the workflow
		await inngest.send({
			name: "risk/procurement.completed",
			data: {
				workflowId,
				applicantId,
				procureCheckResult: {
					riskScore: procureCheckResult.riskScore,
					anomalies: procureCheckResult.anomalies,
					recommendedAction: procureCheckResult.recommendedAction,
					rawData: procureCheckResult.rawData,
				},
				decision: {
					outcome: decision.outcome,
					decidedBy: userId,
					reason: decision.reason,
					timestamp: new Date().toISOString(),
				},
			},
		});

		console.log(`[ProcurementDecision] Event sent to Inngest for workflow ${workflowId}`);

		// Return success response
		return NextResponse.json({
			success: true,
			message: `Procurement decision recorded: ${decision.outcome}`,
			workflowId,
			applicantId,
			decision: {
				outcome: decision.outcome,
				decidedBy: userId,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("[ProcurementDecision] Error processing decision:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
