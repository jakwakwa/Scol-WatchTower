import { getDatabaseClient } from "@/app/utils";
import { notifications, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface CreateNotificationParams {
	workflowId: number;
	applicantId: number;
	type: "awaiting" | "completed" | "failed" | "timeout" | "paused" | "error";
	title: string;
	message: string;
	actionable?: boolean;
	errorDetails?: object;
}

export interface LogEventParams {
	workflowId: number;
	eventType:
		| "stage_change"
		| "agent_dispatch"
		| "agent_callback"
		| "human_override"
		| "timeout"
		| "error";
	payload: object;
	actorType?: "user" | "agent" | "platform";
	actorId?: string;
}

/**
 * Create a notification in the Control Tower UI
 */
export async function createWorkflowNotification(
	params: CreateNotificationParams,
): Promise<void> {
	console.log(
		`[NotificationEvents] Creating notification: ${params.title} - ${params.message}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		console.error("[NotificationEvents] Failed to get database client");
		return;
	}

	try {
		await db.insert(notifications).values([
			{
				workflowId: params.workflowId,
				applicantId: params.applicantId,
				type: params.type,
				// Title doesn't exist in schema, combining with message
				message: `${params.title}: ${params.message}`,
				actionable: params.actionable ?? true,
				read: false,
			},
		]);
	} catch (error) {
		console.error("[NotificationEvents] Failed to create notification:", error);
	}
}

/**
 * Log a workflow event to the activity feed
 */
export async function logWorkflowEvent(params: LogEventParams): Promise<void> {
	console.log(
		`[NotificationEvents] Logging event: ${params.eventType} for workflow ${params.workflowId}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		console.error("[NotificationEvents] Failed to get database client");
		return;
	}

	try {
		await db.insert(workflowEvents).values([
			{
				workflowId: params.workflowId,
				eventType: params.eventType,
				payload: JSON.stringify(params.payload),
				actorType: params.actorType || "platform",
				actorId: params.actorId,
				timestamp: new Date(),
			},
		]);
	} catch (error) {
		console.error("[NotificationEvents] Failed to log workflow event:", error);
	}
}
