/**
 * Workflow service - database operations for workflow state
 */
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { WorkflowStatus } from "@/inngest/steps/database";

/**
 * Update workflow status and stage in the database
 */
export async function updateWorkflowStatus(
	workflowId: number,
	status: WorkflowStatus,
	stage: number,
): Promise<void> {
	console.log(
		`[WorkflowService] Updating Workflow ${workflowId}: Status=${status}, Stage=${stage}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Failed to get database client");
	}

	await db
		.update(workflows)
		.set({
			status: status as any,
			stage,
		})
		.where(eq(workflows.id, workflowId));
}
