/**
 * StratCol Onboarding Workflow - Complete Saga Implementation
 *
 * This is the main workflow for client onboarding following the StratCol
 * Risk Management Modernization Plan. It implements:
 *
 * Stage 1: Lead Capture & Commitment (Zero-Entry Application)
 * Stage 2: Dynamic Quotation & ITC Check (Paperwork Cascade)
 * Stage 3: Intelligent Verification & AI FICA Analysis (Digital Forensic Lab)
 * Stage 4: Integration & V24 Handover (Activation)
 *
 * Business Rules:
 * - ITC Score < 600: Auto-decline or route to manual review
 * - AI Trust Score >= 80%: Auto-approve
 * - AI Trust Score < 80%: Risk Manager (Paula) reviews
 * - 14-day timeout for FICA document uploads
 */
import { inngest } from '../client';
import { NonRetriableError } from 'inngest';
import blacklist from '../data/mock_blacklist.json';
import { updateWorkflowStatus } from '@/lib/services/workflow.service';
import { dispatchToPlatform, escalateToManagement } from '@/lib/services/notification.service';
import { createWorkflowNotification, logWorkflowEvent } from '@/lib/services/notification-events.service';
import { generateQuote } from '@/lib/services/quote.service';
import { performITCCheck, shouldAutoDecline } from '@/lib/services/itc.service';
import {
    analyzeBankStatement,
    canAutoApprove as canAutoApproveFica,
    requiresManualReview,
} from '@/lib/services/fica-ai.service';
import {
    createV24ClientProfile,
    scheduleTrainingSession,
    sendWelcomePack,
    generateTemporaryPassword,
} from '@/lib/services/v24.service';
import { ITC_THRESHOLDS, AI_TRUST_THRESHOLDS } from '@/lib/types';
import type { Events } from '../events';

// ============================================
// Helper: Safe Step Execution with HITL
// ============================================

async function runSafeStep<T>(
    step: any,
    stepId: string,
    operation: () => Promise<T>,
    context: { workflowId: number; leadId: number; stage: number },
): Promise<T | null> {
    try {
        return await step.run(stepId, operation);
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Workflow] Step ${stepId} failed:`, errorMessage);

        // Log error event
        await step.run(`${stepId}-log-error`, () =>
            logWorkflowEvent({
                workflowId: context.workflowId,
                eventType: 'error',
                payload: { step: stepId, error: errorMessage, stage: context.stage },
            }),
        );

        // Create notification
        await step.run(`${stepId}-notify-error`, () =>
            createWorkflowNotification({
                workflowId: context.workflowId,
                leadId: context.leadId,
                type: 'error',
                title: 'Workflow Error - Action Required',
                message: `Step "${stepId}" failed: ${errorMessage}`,
                actionable: true,
                errorDetails: { step: stepId, error: errorMessage },
            }),
        );

        // Pause workflow status
        await step.run(`${stepId}-set-paused`, () => updateWorkflowStatus(context.workflowId, 'paused', context.stage));

        // Wait for HITL resolution
        const resolution = await step.waitForEvent(`${stepId}-wait-resolution`, {
            event: 'workflow/error-resolved',
            timeout: '30d',
            match: 'data.workflowId',
        });

        if (!resolution || resolution.data.action === 'cancel') {
            await step.run(`${stepId}-handle-cancel`, () =>
                updateWorkflowStatus(context.workflowId, 'failed', context.stage),
            );
            throw new Error(`Workflow cancelled at step ${stepId}: ${errorMessage}`);
        }

        if (resolution.data.action === 'retry') {
            throw new Error(`[Retry Signal] Retrying step ${stepId} by user request`);
        }

        // Continue (skip step)
        return null;
    }
}

// ============================================
// Main Onboarding Workflow
// ============================================

export const onboardingWorkflow = inngest.createFunction(
    { id: 'stratcol-client-onboarding', name: 'StratCol Client Onboarding' },
    { event: 'onboarding/lead.created' },
    async ({ event, step }) => {
        const { leadId, workflowId } = event.data;

        console.log(`[Workflow] STARTED for lead=${leadId} workflow=${workflowId}`);

        // ================================================================
        // Verification Veto Check (Blacklist)
        // ================================================================
        await step.run('verification-veto-check', async () => {
            if (blacklist.includes(leadId)) {
                const message = `[Veto] Lead ${leadId} is blacklisted. Workflow terminated.`;
                console.error(message);

                await logWorkflowEvent({
                    workflowId,
                    eventType: 'error',
                    payload: { error: 'Lead Blacklisted', reason: 'Manual Veto' },
                });

                await updateWorkflowStatus(workflowId, 'failed', 1);
                throw new NonRetriableError(message);
            }
        });

        // ================================================================
        // STAGE 1: Lead Capture & Commitment
        // ================================================================
        await runSafeStep(step, 'stage-1-processing', () => updateWorkflowStatus(workflowId, 'processing', 1), {
            workflowId,
            leadId,
            stage: 1,
        });

        // (Zapier webhooks removed - using direct Inngest events)

        // ================================================================
        // STEP: ITC Credit Check (SOP Step 2.1)
        // Mock API call to credit bureau. If score < 600, auto-decline
        // ================================================================
        const itcResult = await step.run('run-itc-check', async () => {
            console.log(`[Workflow] Running ITC credit check for lead ${leadId}`);
            return performITCCheck({ leadId, workflowId });
        });

        // Log ITC result
        await step.run('log-itc-result', () =>
            logWorkflowEvent({
                workflowId,
                eventType: 'stage_change',
                payload: {
                    step: 'itc-check',
                    creditScore: itcResult.creditScore,
                    recommendation: itcResult.recommendation,
                    passed: itcResult.passed,
                },
            }),
        );

        // Handle ITC decision
        if (shouldAutoDecline(itcResult)) {
            console.log(`[Workflow] ITC Auto-Decline: Score ${itcResult.creditScore} < ${ITC_THRESHOLDS.AUTO_DECLINE}`);

            await step.run('itc-decline-update', () => updateWorkflowStatus(workflowId, 'failed', 1));

            await step.run('itc-decline-notify', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'failed',
                    title: 'Application Declined - Credit Check',
                    message: `ITC credit score (${itcResult.creditScore}) below minimum threshold.`,
                    actionable: false,
                }),
            );

            return {
                status: 'declined',
                stage: 1,
                reason: 'ITC credit check failed',
                creditScore: itcResult.creditScore,
            };
        }

        // ================================================================
        // STAGE 2: Dynamic Quotation & Quality Gating (Paperwork Cascade)
        // ================================================================
        await runSafeStep(step, 'stage-2-processing', () => updateWorkflowStatus(workflowId, 'processing', 2), {
            workflowId,
            leadId,
            stage: 2,
        });

        // Generate quote based on ITC result and lead data
        const quoteReqResult = await step.run('generate-legal-pack', () => generateQuote(leadId, workflowId));

        let quote;
        const quoteResult = { ...quoteReqResult };

        if (quoteReqResult.success && quoteReqResult.async) {
            console.log('[Workflow] Quote generation request sent. Waiting for callback...');

            const quoteEvent = await step.waitForEvent('wait-for-quote', {
                event: 'onboarding/quote-generated',
                match: 'data.workflowId',
                timeout: '24h',
            });

            if (!quoteEvent) {
                quoteResult.success = false;
                quoteResult.error = 'Quote generation timed out';
            } else {
                quote = quoteEvent.data.quote;
                quoteResult.success = true;
                quoteResult.quote = quote;
            }
        } else {
            quote = quoteResult.quote;
        }

        // Handle quote error with HITL
        if (!quoteResult.success) {
            const errorMessage = quoteResult.error || 'Unknown quote error';

            await step.run('stage-2-quote-error-log', () =>
                logWorkflowEvent({
                    workflowId,
                    eventType: 'error',
                    payload: { step: 'generate-legal-pack', error: errorMessage },
                }),
            );

            await step.run('stage-2-quote-notify', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'error',
                    title: 'Quote Generation Failed',
                    message: errorMessage,
                    actionable: true,
                    errorDetails: { error: errorMessage },
                }),
            );

            await step.run('stage-2-quote-pause', () => updateWorkflowStatus(workflowId, 'paused', 2));

            const resolution = await step.waitForEvent('stage-2-quote-wait-resolution', {
                event: 'workflow/error-resolved',
                match: 'data.workflowId',
                timeout: '30d',
            });

            if (!resolution || resolution.data.action === 'cancel') {
                await step.run('stage-2-quote-cancel', () => updateWorkflowStatus(workflowId, 'failed', 2));
                return { status: 'failed', error: errorMessage };
            }

            if (resolution.data.action === 'retry') {
                throw new Error('Retrying quote generation...');
            }
        }

        // Quote generated - continue with Stage 3
        // (Zapier webhooks removed - using direct Inngest events)

        // Wait for Contract Signing
        await runSafeStep(
            step,
            'stage-2-awaiting-contract',
            () => updateWorkflowStatus(workflowId, 'awaiting_human', 2),
            { workflowId, leadId, stage: 2 },
        );

        console.log('[Workflow] Waiting for Contract Signed signal...');
        const contractEvent = await step.waitForEvent('wait-for-contract', {
            event: 'contract/signed',
            match: 'data.workflowId',
            timeout: '7d',
        });

        if (!contractEvent) {
            console.error('[Workflow] Contract signing timeout!');
            await step.run('contract-timeout', () => updateWorkflowStatus(workflowId, 'timeout', 2));
            await step.run('contract-timeout-notify', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'timeout',
                    title: 'Contract Signing Timeout',
                    message: 'Workflow timed out waiting for contract signature.',
                    actionable: true,
                }),
            );
            return { status: 'timeout', stage: 2, reason: 'Contract signing timeout' };
        }

        console.log('[Workflow] Contract Signed!');

        // ================================================================
        // STAGE 3: Intelligent Verification (Digital Forensic Lab)
        // Wait for FICA documents, then run AI analysis
        // ================================================================
        await runSafeStep(step, 'stage-3-processing', () => updateWorkflowStatus(workflowId, 'processing', 3), {
            workflowId,
            leadId,
            stage: 3,
        });

        // SOP Step 2.3: Wait for FICA Documents (14-day timeout)
        console.log('[Workflow] Waiting for FICA documents (14-day timeout)...');
        await step.run('stage-3-request-fica', () =>
            createWorkflowNotification({
                workflowId,
                leadId,
                type: 'awaiting',
                title: 'FICA Documents Required',
                message: 'Please upload 3 months bank statements and accountant letter.',
                actionable: true,
            }),
        );

        const ficaUploadEvent = await step.waitForEvent('wait-for-documents', {
            event: 'upload/fica.received',
            match: 'data.workflowId',
            timeout: '14d',
        });

        if (!ficaUploadEvent) {
            console.error('[Workflow] FICA document upload timeout!');
            await step.run('fica-timeout', () => updateWorkflowStatus(workflowId, 'timeout', 3));
            await step.run('fica-timeout-notify', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'timeout',
                    title: 'FICA Upload Timeout',
                    message: 'Client did not upload FICA documents within 14 days. Workflow paused.',
                    actionable: true,
                }),
            );
            return {
                status: 'timeout',
                stage: 3,
                reason: 'FICA document upload timeout (14 days)',
            };
        }

        console.log('[Workflow] FICA Documents received:', ficaUploadEvent.data.documents.length, 'file(s)');

        // SOP Step 2.4: AI FICA Verification (Vercel AI SDK)
        const ficaAnalysis = await step.run('ai-fica-verification', async () => {
            console.log('[Workflow] Running AI FICA verification...');

            // Find bank statement in uploaded documents
            const bankStatement = ficaUploadEvent.data.documents.find((d: any) => d.type === 'BANK_STATEMENT');

            if (!bankStatement) {
                throw new Error('Bank statement not found in uploaded documents');
            }

            // Analyze using Vercel AI SDK
            return analyzeBankStatement({
                content: bankStatement.url, // In production, fetch and extract content
                contentType: 'text',
                workflowId,
            });
        });

        // Log AI analysis result
        await step.run('log-fica-analysis', () =>
            logWorkflowEvent({
                workflowId,
                eventType: 'stage_change',
                payload: {
                    step: 'ai-fica-verification',
                    aiTrustScore: ficaAnalysis.aiTrustScore,
                    recommendation: ficaAnalysis.recommendation,
                    riskFlagsCount: ficaAnalysis.riskFlags.length,
                },
            }),
        );

        // SOP Step 2.5: Human Risk Review (HITL)
        // If AI Trust Score >= 80%: Auto-approve
        // If AI Trust Score < 80%: Pause for Risk Manager
        let riskDecision: {
            outcome: 'APPROVED' | 'REJECTED' | 'REQUEST_MORE_INFO';
            decidedBy: string;
            reason?: string;
        };

        if (canAutoApproveFica(ficaAnalysis)) {
            console.log(
                `[Workflow] Auto-approving: AI Trust Score ${ficaAnalysis.aiTrustScore} >= ${AI_TRUST_THRESHOLDS.AUTO_APPROVE}`,
            );
            riskDecision = {
                outcome: 'APPROVED',
                decidedBy: 'ai_auto_approval',
                reason: `Auto-approved: AI Trust Score ${ficaAnalysis.aiTrustScore}%`,
            };
        } else {
            // Requires human review
            console.log(`[Workflow] Manual review required: AI Trust Score ${ficaAnalysis.aiTrustScore}`);

            await step.run('stage-3-awaiting-risk-review', () => updateWorkflowStatus(workflowId, 'awaiting_human', 3));

            await step.run('notify-risk-manager', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'awaiting',
                    title: 'Risk Review Required',
                    message: `AI Trust Score: ${ficaAnalysis.aiTrustScore}%. ${ficaAnalysis.riskFlags.length} risk flag(s) detected. Manual review required.`,
                    actionable: true,
                    errorDetails: {
                        aiTrustScore: ficaAnalysis.aiTrustScore,
                        riskFlags: ficaAnalysis.riskFlags,
                        summary: ficaAnalysis.summary,
                    },
                }),
            );

            // Wait for Risk Manager decision
            console.log('[Workflow] Waiting for Risk Manager decision...');
            const riskEvent = await step.waitForEvent('human-risk-review', {
                event: 'risk/decision.received',
                match: 'data.workflowId',
                timeout: '7d',
            });

            if (!riskEvent) {
                await step.run('risk-timeout', () => updateWorkflowStatus(workflowId, 'timeout', 3));
                return {
                    status: 'timeout',
                    stage: 3,
                    reason: 'Risk Manager review timeout',
                };
            }

            riskDecision = riskEvent.data.decision;
        }

        // Handle rejection
        if (riskDecision.outcome === 'REJECTED') {
            console.log('[Workflow] Application REJECTED:', riskDecision.reason);

            await step.run('rejected-update', () => updateWorkflowStatus(workflowId, 'failed', 3));

            await step.run('rejected-notify', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'failed',
                    title: 'Application Rejected',
                    message: riskDecision.reason || 'Rejected by Risk Manager',
                    actionable: false,
                }),
            );

            return {
                status: 'rejected',
                stage: 3,
                reason: riskDecision.reason,
                decidedBy: riskDecision.decidedBy,
            };
        }

        // Handle request for more info
        if (riskDecision.outcome === 'REQUEST_MORE_INFO') {
            // Loop back to document upload
            console.log('[Workflow] Additional information requested');
            // For now, treat as timeout - in full implementation, loop back
            return {
                status: 'pending_info',
                stage: 3,
                reason: riskDecision.reason,
            };
        }

        // ================================================================
        // STAGE 4: Integration & V24 Handover (Activation)
        // ================================================================
        console.log('[Workflow] Application APPROVED - Starting V24 handoff');

        await runSafeStep(step, 'stage-4-processing', () => updateWorkflowStatus(workflowId, 'processing', 4), {
            workflowId,
            leadId,
            stage: 4,
        });

        // SOP Step 4: V24 Integration
        // Create client profile in V24 core system
        const v24Result = await step.run('v24-create-client', async () => {
            return createV24ClientProfile({
                leadId,
                workflowId,
                mandateType: 'EFT', // Would come from facility application
                approvedVolume: 100000_00, // Would come from quote
                feePercent: 150, // 1.5% in basis points
            });
        });

        if (!v24Result.success) {
            console.error('[Workflow] V24 client creation failed:', v24Result.error);

            await step.run('v24-error-notify', () =>
                createWorkflowNotification({
                    workflowId,
                    leadId,
                    type: 'error',
                    title: 'V24 Integration Error',
                    message: v24Result.error || 'Failed to create client in V24',
                    actionable: true,
                    errorDetails: { error: v24Result.error },
                }),
            );

            // Don't fail the workflow - log and continue
        } else {
            console.log('[Workflow] V24 client created:', v24Result.v24Reference);

            // Log V24 success
            await step.run('log-v24-success', () =>
                logWorkflowEvent({
                    workflowId,
                    eventType: 'stage_change',
                    payload: {
                        step: 'v24-integration',
                        clientId: v24Result.clientId,
                        v24Reference: v24Result.v24Reference,
                    },
                }),
            );
        }

        // Schedule training session
        const trainingSession = await step.run('schedule-training', async () => {
            // Get lead email from database (simplified)
            return scheduleTrainingSession({
                email: 'client@example.com', // Would fetch from lead
                clientName: 'Test Company', // Would fetch from lead
            });
        });

        console.log('[Workflow] Training session scheduled:', trainingSession.sessionId);

        // Send welcome pack
        await step.run('send-welcome-pack', async () => {
            return sendWelcomePack({
                email: 'client@example.com', // Would fetch from lead
                clientName: 'Test Company',
                v24Reference: v24Result.v24Reference || `SC-${workflowId}`,
                portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
                temporaryPassword: generateTemporaryPassword(),
            });
        });

        // Mark workflow complete
        await runSafeStep(step, 'stage-4-complete', () => updateWorkflowStatus(workflowId, 'completed', 4), {
            workflowId,
            leadId,
            stage: 4,
        });

        // (Zapier webhooks removed - using direct Inngest events)

        console.log('[Workflow] COMPLETED successfully!');

        return {
            status: 'completed',
            stage: 4,
            v24Reference: v24Result.v24Reference,
            trainingSessionId: trainingSession.sessionId,
        };
    },
);
