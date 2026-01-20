import { NextRequest, NextResponse } from "next/server";
import { getTemporalClient } from "@/lib/temporal";
import { z } from "zod";

// Schema for internal UI signals
const uiSignalSchema = z.object({
	signalName: z.enum(["qualityGatePassed", "humanOverride"]),
	payload: z.any(),
});

// Schema for Platform / Agent Callbacks
const agentCallbackSchema = z.object({
	// Platform might send string or number for ID, we handle flexible input but expect strict structure
	workflowId: z.union([z.string(), z.number()]).optional(),
	agentId: z.string().optional(),
	status: z.string().optional(),
	decision: z.object({
		outcome: z.string(), // "APPROVED", "REJECTED", etc.
		manualOverrides: z.any().optional(),
		reason: z.string().optional(),
	}),
	audit: z
		.object({
			humanActor: z.string().optional(),
			timestamp: z.string().optional(),
		})
		.optional(),
});

/**
 * POST /api/workflows/[id]/signal
 * Signal a running workflow. Supports:
 * 1. Internal UI Signals ({ signalName, payload })
 * 2. External Agent Webhooks (Direct JSON payload)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const workflowId = parseInt(id);

		if (isNaN(workflowId)) {
			return NextResponse.json(
				{ error: "Invalid workflow ID" },
				{ status: 400 },
			);
		}

		const body = await request.json();

		let signalName: string;
		let payload: any;

		// 1. Try parsing as UI Signal
		const uiValidation = uiSignalSchema.safeParse(body);
		if (uiValidation.success) {
			signalName = uiValidation.data.signalName;
			payload = uiValidation.data.payload;
		} else {
			// 2. Try parsing as Agent Callback
			const agentValidation = agentCallbackSchema.safeParse(body);
			if (agentValidation.success) {
				signalName = "agentCallbackReceived";
				payload = agentValidation.data;
				console.log(
					`[API] Recognized Agent Callback for Workflow ${workflowId}`,
				);
			} else {
				// Failed both
				return NextResponse.json(
					{
						error: "Invalid signal data",
						details: {
							uiError: uiValidation.error.flatten(),
							agentError: agentValidation.error.flatten(),
						},
					},
					{ status: 400 },
				);
			}
		}

		const temporalWorkflowId = `onboarding-${workflowId}`;

		const client = await getTemporalClient();
		const handle = client.workflow.getHandle(temporalWorkflowId);

		await handle.signal(signalName, payload);

		console.log(`[API] Signaled ${temporalWorkflowId} with ${signalName}`);

		return NextResponse.json({ success: true, signal: signalName });
	} catch (error) {
		console.error("Error signaling workflow:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json(
			{ error: "Failed to signal workflow", details: message },
			{ status: 500 },
		);
	}
}
