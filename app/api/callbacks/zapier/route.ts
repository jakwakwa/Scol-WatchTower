import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
});

/**
 * POST /api/callbacks/zapier
 * Handle callbacks from Zapier workflows
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

		// 1. Log the event
		await db.insert(workflowEvents).values({
			workflowId: data.workflowId,
			eventType: data.eventType,
			payload: data.payload,
			actorId: data.actorId || "zapier_webhook",
			actorType: "system",
			createdAt: new Date(), // schema default might handle this, but explicit is fine
		} as any);

		// 2. Update workflow status if provided
		if (data.status) {
			await db
				.update(workflows)
				.set({
					status: data.status,
					updatedAt: new Date(), // assuming updatedAt exists or we rely on trigger/default
				} as any)
				.where(eq(workflows.id, data.workflowId));
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error processing Zapier callback:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
