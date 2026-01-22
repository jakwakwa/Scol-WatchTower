import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/app/utils';
import { workflows, workflowEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { inngest } from '@/inngest';

// Schema for  callback
const agentCallbackSchema = z.object({
    workflowId: z.coerce.number().int(),
    status: z.string().optional(), // Relaxed from enum to allow "Approved" etc.
    eventType: z.enum(['stage_change', 'agent_dispatch', 'agent_callback', 'human_override', 'timeout', 'error']),
    payload: z.string().optional(),
    actorId: z.string().optional(),
    decision: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
    reason: z.string().optional(),
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
                    error: 'Validation failed',
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
                actorId: data.actorId || 'xt_webhook',
                actorType: 'platform',
                createdAt: new Date(),
            } as any);

            // Update workflow status if provided and valid
            if (data.status) {
                const validStatuses = ['pending', 'in_progress', 'awaiting_human', 'completed', 'failed', 'timeout'];
                const normalizedStatus = data.status.toLowerCase();

                if (validStatuses.includes(normalizedStatus)) {
                    await db
                        .update(workflows)
                        .set({
                            status: normalizedStatus as any,
                            updatedAt: new Date(),
                        })
                        .where(eq(workflows.id, data.workflowId));
                }
            }
        }

        // 2. Send Inngest Event to unblock waiting workflow
        if (data.eventType === 'agent_callback') {
            try {
                // Resolve outcome and reason
                let outcome = 'APPROVED';
                let reason = data.reason;

                if (typeof data.decision === 'string') {
                    outcome = data.decision;
                } else if (data.decision && typeof data.decision === 'object') {
                    outcome = data.decision.outcome || outcome;
                    reason = data.decision.reason || reason;
                } else if (data.payload) {
                    try {
                        const payloadJson = JSON.parse(data.payload);
                        outcome = payloadJson.outcome || outcome;
                        reason = payloadJson.reason || reason;
                    } catch {
                        console.warn('Could not parse payload as JSON for decision data');
                    }
                }

                // Normalize outcome
                const finalOutcome = outcome.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'APPROVED';

                await inngest.send({
                    name: 'onboarding/agent-callback',
                    data: {
                        workflowId: data.workflowId,
                        decision: {
                            agentId: data.actorId || 'external',
                            outcome: finalOutcome,
                            reason: reason,
                            timestamp: new Date().toISOString(),
                        },
                    },
                });

                console.log(`[API] Sent Inngest agent callback event for workflow ${data.workflowId}`);
            } catch (inngestError) {
                console.error('Failed to send Inngest event:', inngestError);
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error processing external callback:', error);
        const message = error instanceof Error ? error.message : 'Unexpected error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
