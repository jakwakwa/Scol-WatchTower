import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTemporalClient } from "@/lib/temporal";
import { agentCallbackReceived } from "@/temporal/signals";

// Schema for Zapier callback
const zapierCallbackSchema = z.object({
	workflowId: z.number(),
	status: z
		.enum([
			"pending",
			"in_progress",
			"awaiting_human",
			"completed",
			"failed",
			"timeout",
		])
		.optional(),
	eventType: z.enum([
		"stage_change",
		"agent_dispatch",
		"agent_callback",
		"human_override",
		"timeout",
		"error",
	]),
	payload: z.string().optional(), // JSON string
	actorId: z.string().optional(),
	decision: z.record(z.string(), z.any()).optional(), // Structured decision data
});

/**
 * POST /api/callbacks/zapier
 * Handle callbacks from Zapier workflows
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validation = zapierCallbackSchema.safeParse(body);

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

		// 1. Log the event to DB (Audit Trail)
		const db = await getDatabaseClient();
		if (db) {
			await db.insert(workflowEvents).values({
				workflowId: data.workflowId,
				eventType: data.eventType,
				payload: data.payload,
				actorId: data.actorId || "zapier_webhook",
				actorType: "system",
				createdAt: new Date(),
			} as any);

			// Update workflow status if provided
			if (data.status) {
				await db
					.update(workflows)
					.set({
						status: data.status,
						updatedAt: new Date(),
					} as any)
					.where(eq(workflows.id, data.workflowId));
			}
		}

		// 2. Signal Temporal Workflow
		// If this is an agent callback, we need to unblock the Temporal workflow
		if (data.eventType === "agent_callback") {
			try {
				const client = await getTemporalClient();
				const temporalWorkflowId = `onboarding-${data.workflowId}`;
				const handle = client.workflow.getHandle(temporalWorkflowId);

				// Parse decision data if it's in the payload string or separate field
				let decisionData = data.decision;
				if (!decisionData && data.payload) {
					try {
						decisionData = JSON.parse(data.payload);
					} catch (e) {
						console.warn("Could not parse payload as JSON for decision data");
					}
				}

				await handle.signal(agentCallbackReceived, {
					agentId: data.actorId || "unknown_agent",
					status: data.status || "completed",
					decision: decisionData || {},
					timestamp: new Date().toISOString(),
				});

				console.log(
					`[API] Signaled Temporal workflow ${temporalWorkflowId} with agent callback`,
				);
			} catch (temporalError) {
				console.error("Failed to signal Temporal workflow:", temporalError);
				// We don't fail the request because DB update succeeded, but we should log it
				// In production, we might want to return 500 or retry
			}
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error processing Zapier callback:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
