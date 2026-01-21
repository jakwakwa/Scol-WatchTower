/**
 * Reusable step helpers for database operations
 * Use these in workflow functions for consistent DB state updates
 */
import { updateWorkflowStatus } from "@/lib/services/workflow.service";

export type WorkflowStatus =
	| "pending"
	| "processing"
	| "awaiting_human"
	| "paused"
	| "completed"
	| "failed"
	| "timeout";

/**
 * Creates a step configuration for updating workflow status
 * @example
 * await step.run(dbSteps.updateStatus(workflowId, "processing", 1));
 */
export const dbSteps = {
	updateStatus: (
		workflowId: number,
		status: WorkflowStatus,
		stage: number,
	) => ({
		id: `db-status-stage${stage}-${status}`,
		fn: () => updateWorkflowStatus(workflowId, status, stage),
	}),
};
