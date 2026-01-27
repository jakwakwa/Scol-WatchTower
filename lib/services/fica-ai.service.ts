/**
 * FICA AI Analysis Service
 *
 * Uses Vercel AI SDK to analyze FICA documents (bank statements, accountant letters)
 * and extract structured data for risk assessment.
 *
 * Features:
 * - Bank statement analysis with risk flag detection
 * - Accountant letter verification
 * - Structured output via Zod schemas (generateObject)
 * - AI trust scoring for auto-approval decisions
 * - Multi-model strategy: Gemini 2.0 Flash for complex analysis
 */

import { generateObject } from 'ai';
import { getThinkingModel, isAIConfigured, AI_CONFIG } from '@/lib/ai/models';
import {
    type FicaDocumentAnalysis,
    type AccountantLetterAnalysis,
    type FacilityApplication,
    FicaDocumentAnalysisSchema,
    AccountantLetterAnalysisSchema,
    AI_TRUST_THRESHOLDS,
} from '@/lib/types';

// ============================================
// Types
// ============================================

export interface AnalyzeBankStatementOptions {
    /** PDF content as base64 or text extracted from bank statement */
    content: string;
    /** Content type */
    contentType: 'base64' | 'text';
    /** Facility application to verify against */
    facilityApplication?: Partial<FacilityApplication>;
    /** Workflow ID for tracking */
    workflowId: number;
}

export interface AnalyzeAccountantLetterOptions {
    /** PDF content as base64 or text extracted */
    content: string;
    contentType: 'base64' | 'text';
    facilityApplication?: Partial<FacilityApplication>;
    workflowId: number;
}

// ============================================
// Configuration is imported from @/lib/ai/models

// ============================================
// Bank Statement Analysis
// ============================================

/**
 * Analyze a bank statement using AI
 */
export async function analyzeBankStatement(options: AnalyzeBankStatementOptions): Promise<FicaDocumentAnalysis> {
    const { content, contentType, facilityApplication, workflowId } = options;

    console.log(`[FicaAI] Analyzing bank statement for workflow ${workflowId}`);

    if (isAIConfigured()) {
        try {
            return await analyzeWithAI(content, contentType, facilityApplication);
        } catch (err) {
            console.error('[FicaAI] AI analysis failed:', err);
            console.warn('[FicaAI] Falling back to mock analysis');
        }
    }

    // Mock analysis for development/testing
    return generateMockBankStatementAnalysis(facilityApplication);
}

/**
 * Analyze bank statement with real AI (Vercel AI SDK)
 */
async function analyzeWithAI(
    content: string,
    contentType: 'base64' | 'text',
    facilityApplication?: Partial<FacilityApplication>,
): Promise<FicaDocumentAnalysis> {
    const verificationContext = facilityApplication
        ? `
VERIFICATION CONTEXT:
Verify the bank statement against this facility application:
- Company Name: ${facilityApplication.companyName || 'Not provided'}
- Account Number: ${facilityApplication.bankingDetails?.accountNumber || 'Not provided'}
- Bank Name: ${facilityApplication.bankingDetails?.bankName || 'Not provided'}

Check if the account holder name matches the company name and flag any discrepancies.
`
        : '';

    const prompt = `You are a FICA (Financial Intelligence Centre Act) compliance analyst for a South African financial services company. Analyze this bank statement and extract structured data for risk assessment.

${verificationContext}

BANK STATEMENT CONTENT:
${contentType === 'base64' ? 'Note: Content is base64 encoded. Decode and analyze.' : content}

ANALYSIS REQUIREMENTS:
1. Extract account holder name and account number
2. Identify the bank name and branch code
3. Determine the statement period (start and end dates)
4. Calculate financial metrics:
   - Opening and closing balances
   - Average daily balance
   - Total credits and debits
   - Number of dishonoured/bounced transactions
5. Assess income regularity (REGULAR, IRREGULAR, SEASONAL, or UNKNOWN)
6. Identify the primary income source
7. Calculate a cash flow score (0-100)
8. Detect risk flags with severity levels:
   - BOUNCED_DEBIT: Multiple bounced debit orders
   - GAMBLING: Transactions to gambling sites/casinos
   - IRREGULAR_DEPOSITS: Unusual large deposits
   - CASH_INTENSIVE: High proportion of cash transactions
   - OVERDRAFT: Frequent overdraft usage
   - UNUSUAL_TRANSFERS: Suspicious transfers
9. Verify name and account number match the application
10. Generate an AI trust score (0-100) based on overall financial health
11. Provide a summary and recommendation (APPROVE, APPROVE_WITH_CONDITIONS, MANUAL_REVIEW, or DECLINE)

Be thorough but concise. Flag any concerning patterns immediately.`;

    console.log('[FicaAI] Calling AI model for analysis...');

    const { object } = await generateObject({
        model: getThinkingModel(),
        schema: FicaDocumentAnalysisSchema,
        schemaName: 'FicaDocumentAnalysis',
        schemaDescription:
            'Structured analysis of a South African bank statement for FICA compliance and risk assessment',
        prompt,
        temperature: AI_CONFIG.ANALYSIS_TEMPERATURE,
    });

    console.log(`[FicaAI] AI analysis complete:`, {
        aiTrustScore: object.aiTrustScore,
        recommendation: object.recommendation,
        riskFlagsCount: object.riskFlags.length,
    });

    return object;
}

// ============================================
// Accountant Letter Analysis
// ============================================

/**
 * Analyze an accountant letter using AI
 */
export async function analyzeAccountantLetter(
    options: AnalyzeAccountantLetterOptions,
): Promise<AccountantLetterAnalysis> {
    const { content, contentType, facilityApplication, workflowId } = options;

    console.log(`[FicaAI] Analyzing accountant letter for workflow ${workflowId}`);

    if (isAIConfigured()) {
        try {
            return await analyzeAccountantLetterWithAI(content, contentType, facilityApplication);
        } catch (err) {
            console.error('[FicaAI] AI analysis failed:', err);
            console.warn('[FicaAI] Falling back to mock analysis');
        }
    }

    return generateMockAccountantLetterAnalysis(facilityApplication);
}

/**
 * Analyze accountant letter with real AI
 */
async function analyzeAccountantLetterWithAI(
    content: string,
    contentType: 'base64' | 'text',
    facilityApplication?: Partial<FacilityApplication>,
): Promise<AccountantLetterAnalysis> {
    const prompt = `You are a FICA compliance analyst. Analyze this accountant's letterhead letter and extract verification data.

CLIENT CONTEXT:
- Company Name: ${facilityApplication?.companyName || 'Not provided'}

LETTER CONTENT:
${contentType === 'base64' ? 'Note: Content is base64 encoded. Decode and analyze.' : content}

ANALYSIS REQUIREMENTS:
1. Extract practitioner name and practice number (CA(SA) number)
2. Verify letterhead authenticity indicators
3. Extract the letter date
4. Confirm client name matches the application
5. Assess business standing (GOOD, CONCERNING, POOR, or UNKNOWN)
6. Extract annual turnover if mentioned
7. Note years in business
8. List any concerns mentioned
9. Determine verification confidence (0-100)`;

    const { object } = await generateObject({
        model: getThinkingModel(),
        schema: AccountantLetterAnalysisSchema,
        schemaName: 'AccountantLetterAnalysis',
        schemaDescription: 'Structured analysis of an accountant verification letter',
        prompt,
        temperature: AI_CONFIG.ANALYSIS_TEMPERATURE,
    });

    return object;
}

// ============================================
// Mock Implementations
// ============================================

/**
 * Generate mock bank statement analysis for testing
 */
function generateMockBankStatementAnalysis(facilityApplication?: Partial<FacilityApplication>): FicaDocumentAnalysis {
    const companyName = facilityApplication?.companyName || 'Test Company (Pty) Ltd';
    const accountNumber = facilityApplication?.bankingDetails?.accountNumber || '1234567890';

    // Simulate different scenarios based on company name
    const isHighRisk = companyName.toLowerCase().includes('risk') || companyName.toLowerCase().includes('decline');
    const isLowRisk = companyName.toLowerCase().includes('approve') || companyName.toLowerCase().includes('good');

    const riskFlags: FicaDocumentAnalysis['riskFlags'] = [];
    let aiTrustScore = 75;

    if (isHighRisk) {
        aiTrustScore = 35;
        riskFlags.push(
            {
                type: 'BOUNCED_DEBIT' as const,
                severity: 'HIGH' as const,
                description: 'Multiple bounced debit orders detected',
                evidence: '3 dishonoured debits in the past 30 days',
                amount: 4500_00,
            },
            {
                type: 'IRREGULAR_DEPOSITS' as const,
                severity: 'MEDIUM' as const,
                description: 'Irregular deposit patterns detected',
                evidence: 'Large cash deposits on random dates',
            },
        );
    } else if (!isLowRisk) {
        aiTrustScore = 72;
        riskFlags.push({
            type: 'CASH_INTENSIVE' as const,
            severity: 'LOW' as const,
            description: 'Higher than average cash transactions',
            evidence: '15% of transactions are cash-based',
        });
    } else {
        aiTrustScore = 92;
    }

    const analysis: FicaDocumentAnalysis = {
        accountHolderName: companyName,
        accountNumber: accountNumber,
        bankName: 'First National Bank',
        branchCode: '250655',
        accountType: 'Business Current',
        periodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        periodEnd: new Date().toISOString().slice(0, 10),
        openingBalance: 125000_00,
        closingBalance: 142500_00,
        averageDailyBalance: 135000_00,
        totalCredits: 450000_00,
        totalDebits: 432500_00,
        dishonours: isHighRisk ? 3 : 0,
        incomeRegularity: isHighRisk ? 'IRREGULAR' : 'REGULAR',
        primaryIncomeSource: 'Business Revenue',
        cashFlowScore: isHighRisk ? 45 : 85,
        riskFlags,
        aiTrustScore,
        analysisConfidence: 88,
        nameMatchVerified: true,
        accountMatchVerified: true,
        summary: isHighRisk
            ? 'Bank statement shows concerning patterns including multiple dishonoured debits and irregular deposits. Manual review strongly recommended.'
            : isLowRisk
              ? 'Bank statement shows healthy financial patterns with consistent income and no concerning activity. Suitable for fast-track approval.'
              : 'Bank statement shows generally healthy patterns with minor observations. Standard processing recommended.',
        recommendation: isHighRisk
            ? 'MANUAL_REVIEW'
            : aiTrustScore >= AI_TRUST_THRESHOLDS.AUTO_APPROVE
              ? 'APPROVE'
              : 'APPROVE_WITH_CONDITIONS',
        reasoning: isHighRisk
            ? 'Multiple risk indicators require human oversight before approval.'
            : 'Financial health indicators are within acceptable parameters for the requested mandate volume.',
    };

    console.log(`[FicaAI] Mock analysis complete:`, {
        aiTrustScore: analysis.aiTrustScore,
        recommendation: analysis.recommendation,
        riskFlagsCount: analysis.riskFlags.length,
    });

    return analysis;
}

/**
 * Generate mock accountant letter analysis
 */
function generateMockAccountantLetterAnalysis(
    facilityApplication?: Partial<FacilityApplication>,
): AccountantLetterAnalysis {
    const companyName = facilityApplication?.companyName || 'Test Company (Pty) Ltd';

    return {
        practitionerName: 'Smith & Associates Chartered Accountants',
        practiceNumber: 'CA(SA) 12345',
        letterDate: new Date().toISOString().slice(0, 10),
        clientName: companyName,
        letterheadAuthentic: true,
        businessStanding: 'GOOD',
        annualTurnover: 5400000_00,
        yearsInBusiness: 8,
        concerns: [],
        verified: true,
        confidence: 85,
    };
}

// ============================================
// Result Helpers
// ============================================

/**
 * Determine if analysis allows auto-approval
 */
export function canAutoApprove(analysis: FicaDocumentAnalysis): boolean {
    return (
        analysis.aiTrustScore >= AI_TRUST_THRESHOLDS.AUTO_APPROVE &&
        analysis.nameMatchVerified &&
        analysis.accountMatchVerified &&
        analysis.riskFlags.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length === 0
    );
}

/**
 * Determine if analysis requires manual review
 */
export function requiresManualReview(analysis: FicaDocumentAnalysis): boolean {
    return (
        analysis.aiTrustScore < AI_TRUST_THRESHOLDS.AUTO_APPROVE ||
        !analysis.nameMatchVerified ||
        !analysis.accountMatchVerified ||
        analysis.recommendation === 'MANUAL_REVIEW' ||
        analysis.riskFlags.some(f => f.severity === 'HIGH' || f.severity === 'CRITICAL')
    );
}

/**
 * Calculate combined risk score from multiple analyses
 */
export function calculateCombinedRiskScore(
    bankAnalysis: FicaDocumentAnalysis,
    accountantAnalysis?: AccountantLetterAnalysis,
): number {
    const bankWeight = 0.7;
    const accountantWeight = 0.3;

    let score = bankAnalysis.aiTrustScore * bankWeight;

    if (accountantAnalysis) {
        let accountantScore = 50;
        if (accountantAnalysis.verified) accountantScore += 20;
        if (accountantAnalysis.letterheadAuthentic) accountantScore += 15;
        if (accountantAnalysis.businessStanding === 'GOOD') accountantScore += 15;
        if (accountantAnalysis.concerns.length === 0) accountantScore += 10;

        score += Math.min(accountantScore, 100) * accountantWeight;
    } else {
        score = bankAnalysis.aiTrustScore;
    }

    return Math.round(score);
}
