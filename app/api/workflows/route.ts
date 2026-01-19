import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { z } from "zod";
import { getTemporalClient } from "@/lib/temporal";
import { onboardingWorkflow } from "@/temporal/workflows";

// Schema for creating a workflow (define locally if not available in validations yet)
const createWorkflowSchema = z.object({
	leadId: z.number(),
	stage: z.number().default(1),
	stageName: z
		.enum(["lead_capture", "dynamic_quotation", "verification", "integration"])
		.default("lead_capture"),
	status: z
		.enum([
			"pending",
			"in_progress",
			"awaiting_human",
			"completed",
			"failed",
			"timeout",
		])
		.default("pending"),
	currentAgent: z.string().optional(),
	metadata: z.string().optional(),
});

/**
 * GET /api/workflows
 * List all workflows
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

		const allWorkflows = await db
			.select()
			.from(workflows)
			.orderBy(workflows.startedAt);

		return NextResponse.json({ workflows: allWorkflows });
	} catch (error) {
		console.error("Error fetching workflows:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * POST /api/workflows
 * Create a new workflow instance
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

		const validation = createWorkflowSchema.safeParse(body);

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

		const newWorkflowResults = await db
			.insert(workflows)
			.values({
				leadId: data.leadId,
				stage: data.stage,
				stageName: data.stageName,
				status: data.status,
				currentAgent: data.currentAgent,
				metadata: data.metadata,
			} as any)
			.returning();

		const newWorkflow = newWorkflowResults[0];

		if (!newWorkflow) {
			throw new Error("Failed to create workflow record");
		}

		// Trigger Temporal Workflow
		try {
			const client = await getTemporalClient();
			await client.workflow.start(onboardingWorkflow, {
				args: [{ leadId: newWorkflow.leadId, workflowId: newWorkflow.id }],
				taskQueue: "onboarding-queue",
				workflowId: `onboarding-${newWorkflow.id}`,
			});
		} catch (temporalError) {
			console.error("Failed to start Temporal workflow:", temporalError);
		}

		return NextResponse.json({ workflow: newWorkflow }, { status: 201 });
	} catch (error) {
		console.error("Error creating workflow:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
