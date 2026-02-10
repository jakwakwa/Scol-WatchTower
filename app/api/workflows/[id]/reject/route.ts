import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents, quotes, agentCallbacks, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const rejectWorkflowSchema = z.object({
	reason: z.string().optional(),
	actor: z.string().optional(),
});

/**
 * DELETE /api/workflows/[id]/reject
 * Rejects a workflow by deleting it and related data.
 * IMPORTANT: This does NOT delete the applicant - only the workflow.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const workflowId = parseInt(id, 10);

		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const db = await getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Parse optional body for audit purposes
		let body: { reason?: string; actor?: string } = {};
		try {
			body = await request.json();
			rejectWorkflowSchema.parse(body);
		} catch {
			// Body is optional, continue without it
		}

		// Check if workflow exists
		const existingWorkflow = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId))
			.limit(1);

		if (existingWorkflow.length === 0) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}

		const workflow = existingWorkflow[0];

		// Delete related records in order (respecting foreign keys)
		// 1. Delete agent callbacks
		await db.delete(agentCallbacks).where(eq(agentCallbacks.workflowId, workflowId));

		// 2. Delete workflow events
		await db.delete(workflowEvents).where(eq(workflowEvents.workflowId, workflowId));

		// 3. Delete quotes
		await db.delete(quotes).where(eq(quotes.workflowId, workflowId));

		// 4. Delete notifications related to this workflow
		await db.delete(notifications).where(eq(notifications.workflowId, workflowId));

		// 5. Finally delete the workflow itself
		await db.delete(workflows).where(eq(workflows.id, workflowId));


		return NextResponse.json({
			success: true,
			message: "Workflow rejected and removed",
			workflowId,
			applicantId: workflow.applicantId,
		});
	} catch (error) {
		console.error("Error rejecting workflow:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
