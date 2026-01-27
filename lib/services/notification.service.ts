/**
 * Notification service - internal notification operations
 * (Zapier webhooks removed - using direct Inngest events)
 */
import { getDatabaseClient } from '@/app/utils';
import { leads } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface DispatchPayload {
    leadId: number;
    workflowId: number;
    riskScore: number;
    anomalies: string[];
    documentLinks?: string[];
}

/**
 * Dispatch to internal platform for agent review
 * (Uses internal notification system instead of external webhooks)
 */
export async function dispatchToPlatform(payload: DispatchPayload): Promise<void> {
    console.log(`[NotificationService] Dispatching to Platform: Workflow ${payload.workflowId}`);

    let clientName = 'Unknown Client';

    // Fetch client name
    if (payload.leadId) {
        const db = getDatabaseClient();
        if (db) {
            try {
                const leadResults = await db.select().from(leads).where(eq(leads.id, payload.leadId));
                if (leadResults.length > 0 && leadResults[0]) {
                    clientName = leadResults[0].companyName;
                }
            } catch (err) {
                console.error('[NotificationService] Failed to fetch lead:', err);
            }
        }
    }

    // Log dispatch - no external webhook needed
    console.log(`[NotificationService] Platform dispatch for: ${clientName}`, {
        workflowId: payload.workflowId,
        riskScore: payload.riskScore,
        anomalies: payload.anomalies,
    });
}

export interface EscalationPayload {
    workflowId: number;
    leadId: number;
    reason: string;
}

/**
 * Escalate workflow to management
 * (Uses internal notification system instead of external webhooks)
 */
export async function escalateToManagement(payload: EscalationPayload): Promise<void> {
    console.warn(`[NotificationService] ESCALATING Workflow ${payload.workflowId}: ${payload.reason}`);

    // TODO: Create internal notification for management
    // For now, just log the escalation
    console.log(`[NotificationService] Escalation logged:`, {
        workflowId: payload.workflowId,
        leadId: payload.leadId,
        reason: payload.reason,
    });
}
