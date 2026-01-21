import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { inngest } from "@/inngest";

// Schema for  callback
const agentCallbackSchema = z.object({
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
	payload: z.string().optional(),
	actorId: z.string().optional(),
	decision: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/callbacks/agent
 * Handle callbacks from external workflows
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validation = agentCallbackSchema.safeParse(body);

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
				actorId: data.actorId || "xt_webhook",
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

		// 2. Send Inngest Event to unblock waiting workflow
		if (data.eventType === "agent_callback") {
			try {
				// Parse decision data
				let decisionData = data.decision;
				if (!decisionData && data.payload) {
					try {
						decisionData = JSON.parse(data.payload);
					} catch {
						console.warn("Could not parse payload as JSON for decision data");
					}
				}

				await inngest.send({
					name: "onboarding/agent-callback",
					data: {
						workflowId: data.workflowId,
						decision: {
							agentId: data.actorId || "external",
							outcome:
								(decisionData?.outcome as "APPROVED" | "REJECTED") ||
								"APPROVED",
							reason: decisionData?.reason,
							timestamp: new Date().toISOString(),
						},
					},
				});

				console.log(
					`[API] Sent Inngest agent callback event for workflow ${data.workflowId}`,
				);
			} catch (inngestError) {
				console.error("Failed to send Inngest event:", inngestError);
			}
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error processing external callback:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
