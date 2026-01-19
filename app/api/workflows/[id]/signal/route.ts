import { NextRequest, NextResponse } from "next/server";
import { getTemporalClient } from "@/lib/temporal";
import { z } from "zod";

// Valid signal names we accept from UI
const signalSchema = z.object({
	signalName: z.enum(["qualityGatePassed", "humanOverride"]),
	payload: z.any(),
});

/**
 * POST /api/workflows/[id]/signal
 * Signal a running workflow
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }, // Correct Next.js 15 params typing
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
		const validation = signalSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: "Invalid signal data", details: validation.error },
				{ status: 400 },
			);
		}

		const { signalName, payload } = validation.data;
		const temporalWorkflowId = `onboarding-${workflowId}`;

		const client = await getTemporalClient();
		const handle = client.workflow.getHandle(temporalWorkflowId);

		// Send the signal
		// Note: In a real app we might map string names to imported signal definitions to ensure type safety,
		// but client.workflow.getHandle().signal("name") works with string names too if not using the definition directly.
		// To use the definition, we'd need a mapping or switch.

		await handle.signal(signalName, payload);

		console.log(`[API] Signaled ${temporalWorkflowId} with ${signalName}`);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error signaling workflow:", error);
		return NextResponse.json(
			{ error: "Failed to signal workflow" },
			{ status: 500 },
		);
	}
}
