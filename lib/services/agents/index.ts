/**
 * AI Agents - Control Tower
 *
 * Export all agent services for the onboarding workflow
 */

// Validation Agent (Real Implementation)
export {
	validateDocument,
	validateDocumentsBatch,
	type ValidationResult,
	type ValidationInput,
	type BatchValidationInput,
	type BatchValidationResult,
} from "./validation.agent";

// Risk Agent (Mock Implementation - Phase 1)
export {
	analyzeFinancialRisk,
	canAutoApprove as canAutoApproveRisk,
	requiresManualReview as requiresManualRiskReview,
	RISK_THRESHOLDS,
	type RiskAnalysisResult,
	type RiskAnalysisInput,
} from "./risk.agent";

// Sanctions Agent (Mock Implementation - Phase 1)
export {
	performSanctionsCheck,
	performBatchSanctionsCheck,
	canAutoApprove as canAutoApproveSanctions,
	isBlocked as isSanctionsBlocked,
	type SanctionsCheckResult,
	type SanctionsCheckInput,
	type BatchSanctionsInput,
	type BatchSanctionsResult,
} from "./sanctions.agent";

// Aggregated Analysis Service
export {
	performAggregatedAnalysis,
	type AggregatedAnalysisInput,
	type AggregatedAnalysisResult,
} from "./aggregated-analysis.service";
