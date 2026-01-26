/**
 * ITC Credit Bureau Service
 *
 * Mock implementation for ITC credit checks.
 * In production, this would integrate with TransUnion, Experian, or XDS.
 *
 * Business Logic:
 * - Score >= 700: AUTO_APPROVE (fast-track)
 * - Score 600-699: MANUAL_REVIEW (human required)
 * - Score < 600: AUTO_DECLINE (or enhanced due diligence)
 */

import { getDatabaseClient } from '@/app/utils';
import { leads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { type ITCCheckResult, ITCCheckResultSchema, ITC_THRESHOLDS } from '@/lib/types';

export interface ITCCheckOptions {
    /** Lead ID to check */
    leadId: number;
    /** Workflow ID for tracking */
    workflowId: number;
    /** Force a specific score for testing */
    forceScore?: number;
}

/**
 * Perform ITC credit check for a lead
 */
export async function performITCCheck(options: ITCCheckOptions): Promise<ITCCheckResult> {
    const { leadId, workflowId, forceScore } = options;

    console.log(`[ITCService] Performing credit check for Lead ${leadId}, Workflow ${workflowId}`);

    // Fetch lead data for the check
    const db = getDatabaseClient();
    let leadData = null;

    if (db) {
        try {
            const leadResults = await db.select().from(leads).where(eq(leads.id, leadId));
            if (leadResults.length > 0) {
                leadData = leadResults[0];
            }
        } catch (err) {
            console.error('[ITCService] Failed to fetch lead:', err);
            throw new Error(`Failed to fetch lead data: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    if (!leadData) {
        throw new Error(`[ITCService] Lead ${leadId} not found`);
    }

    // Check if external ITC service is configured
    const itcServiceUrl = process.env.WEBHOOK_ZAP_ITC_CHECK;

    if (itcServiceUrl) {
        // Call external ITC service
        try {
            const response = await fetch(itcServiceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId,
                    workflowId,
                    companyName: leadData.companyName,
                    registrationNumber: leadData.notes, // Assuming reg number stored in notes for now
                    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/callbacks/itc`,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                return ITCCheckResultSchema.parse({
                    creditScore: result.creditScore,
                    riskCategory: categorizeRisk(result.creditScore),
                    passed: result.creditScore >= ITC_THRESHOLDS.AUTO_DECLINE,
                    recommendation: getRecommendation(result.creditScore),
                    adverseListings: result.adverseListings || [],
                    checkedAt: new Date(),
                    referenceNumber: result.referenceNumber,
                    rawResponse: result,
                });
            }
        } catch (err) {
            console.warn('[ITCService] External service failed, falling back to mock:', err);
        }
    }

    // Mock ITC check (simulated response)
    const mockScore = forceScore ?? generateMockScore(leadData);

    const result: ITCCheckResult = {
        creditScore: mockScore,
        riskCategory: categorizeRisk(mockScore),
        passed: mockScore >= ITC_THRESHOLDS.AUTO_DECLINE,
        recommendation: getRecommendation(mockScore),
        adverseListings: mockScore < 650 ? generateMockAdverseListings() : [],
        checkedAt: new Date(),
        referenceNumber: `ITC-${Date.now()}-${leadId}`,
    };

    console.log(`[ITCService] Credit check complete:`, {
        leadId,
        score: result.creditScore,
        category: result.riskCategory,
        recommendation: result.recommendation,
    });

    return result;
}

/**
 * Generate mock credit score based on lead data
 * Uses company name hash for deterministic testing
 */
function generateMockScore(leadData: { companyName: string }): number {
    // Create deterministic score based on company name
    // This allows consistent testing with the same company
    let hash = 0;
    const name = leadData.companyName.toLowerCase();
    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash = hash & hash;
    }

    // Map hash to score range 450-850
    const normalizedScore = Math.abs(hash % 400) + 450;

    // Add some "known" test cases
    if (name.includes('badcredit') || name.includes('decline')) {
        return 520; // Below threshold
    }
    if (name.includes('review') || name.includes('manual')) {
        return 650; // In manual review range
    }
    if (name.includes('goodcredit') || name.includes('approve')) {
        return 780; // Auto-approve range
    }

    return normalizedScore;
}

/**
 * Categorize risk based on credit score
 */
function categorizeRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    if (score >= 750) return 'LOW';
    if (score >= 650) return 'MEDIUM';
    if (score >= 550) return 'HIGH';
    return 'VERY_HIGH';
}

/**
 * Get recommendation based on credit score
 */
function getRecommendation(
    score: number,
): 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'AUTO_DECLINE' | 'ENHANCED_DUE_DILIGENCE' {
    if (score >= ITC_THRESHOLDS.AUTO_APPROVE) return 'AUTO_APPROVE';
    if (score >= ITC_THRESHOLDS.MANUAL_REVIEW) return 'MANUAL_REVIEW';
    if (score >= 500) return 'ENHANCED_DUE_DILIGENCE';
    return 'AUTO_DECLINE';
}

/**
 * Generate mock adverse listings for low scores
 */
function generateMockAdverseListings() {
    return [
        {
            type: 'Judgement',
            amount: 15000_00, // cents
            date: '2024-06-15',
            creditor: 'ABC Collections',
        },
        {
            type: 'Default',
            amount: 8500_00,
            date: '2024-03-22',
            creditor: 'XYZ Finance',
        },
    ];
}

/**
 * Serialized ITC result (Date becomes string after Inngest serialization)
 */
type SerializedITCResult = {
    creditScore: number;
    recommendation: 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'AUTO_DECLINE' | 'ENHANCED_DUE_DILIGENCE';
};

/**
 * Check if ITC result allows auto-approval
 */
export function canAutoApprove(result: SerializedITCResult): boolean {
    return result.recommendation === 'AUTO_APPROVE' && result.creditScore >= ITC_THRESHOLDS.AUTO_APPROVE;
}

/**
 * Check if ITC result requires manual review
 */
export function requiresManualReview(result: SerializedITCResult): boolean {
    return result.recommendation === 'MANUAL_REVIEW' || result.recommendation === 'ENHANCED_DUE_DILIGENCE';
}

/**
 * Check if ITC result should auto-decline
 */
export function shouldAutoDecline(result: SerializedITCResult): boolean {
    return result.recommendation === 'AUTO_DECLINE' || result.creditScore < ITC_THRESHOLDS.AUTO_DECLINE;
}
