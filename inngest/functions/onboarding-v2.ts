/**
 * StratCol Onboarding Workflow V2 - PRD-Aligned Implementation
 *
 * This refactored workflow follows the business process diagram with:
 * - Sequential processing where forms/documents are requested only when needed
 * - Parallel branches for mandate determination (Procurement + Document collection)
 * - Conditional branching based on overlimit checks, approvals, and risk assessments
 * - AI integration for quotation calculation and document analysis
 *
 * Stages:
 * 1. Applicant Entry & Quotation
 * 2. Quote Signing & Facility Application
 * 3. Mandate Determination (Parallel: Procurement Check + Mandate Documents)
 * 4. AI Analysis & Final Review
 * 5. Contract Signing & Completion
 */

import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getDatabaseClient } from "@/app/utils";
import { applicants, quotes, workflows, riskAssessments } from "@/db/schema";
import { sendInternalAlertEmail, sendApplicantFormLinksEmail } from "@/lib/services/email.service";
import { analyzeBankStatement, canAutoApprove as canAutoApproveFica } from "@/lib/services/fica-ai.service";
import { createFormInstance } from "@/lib/services/form.service";
import { performITCCheck } from "@/lib/services/itc.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote, type QuoteResult, type Quote } from "@/lib/services/quote.service";
import { analyzeRisk, type RiskResult } from "@/lib/services/risk.service";
import {
	createV24ClientProfile,
	generateTemporaryPassword,
	scheduleTrainingSession,
	sendWelcomePack,
} from "@/lib/services/v24.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { FicaDocumentAnalysis, FormType } from "@/lib/types";
import { inngest } from "../client";
import blacklist from "../data/mock_blacklist.json";

// ============================================
// Type Definitions
// ============================================

type QuoteApprovedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		quoteId: number;
		approvedAt: string;
	};
};

type QuoteRejectedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		quoteId: number;
		reason: string;
		isOverlimit: boolean;
		rejectedBy: string;
		rejectedAt: string;
	};
};

type QuoteSignedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		quoteId: number;
		signedAt: string;
	};
};

type FacilityFormSubmittedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		submissionId: number;
		formData: {
			mandateVolume: number;
			mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
			businessType: string;
			annualTurnover?: number;
		};
		submittedAt: string;
	};
};

type MandateDeterminedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
		requiredDocuments: string[];
		requiresProcurementCheck: boolean;
	};
};

type ProcurementCompletedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		procureCheckResult: {
			riskScore: number;
			anomalies: string[];
			recommendedAction: "APPROVE" | "MANUAL_REVIEW" | "DECLINE";
		};
		decision: {
			outcome: "CLEARED" | "DENIED";
			decidedBy: string;
			reason?: string;
			timestamp: string;
		};
	};
};

type MandateDocumentsSubmittedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
		documents: Array<{
			documentId: number;
			documentType: string;
			fileName: string;
			uploadedAt: string;
		}>;
		allRequiredDocsReceived: boolean;
	};
};

type RiskDecisionEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		decision: {
			outcome: "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO";
			decidedBy: string;
			reason?: string;
			conditions?: string[];
			timestamp: string;
		};
	};
};

type FinalApprovalEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		approvedBy: string;
		contractSigned: boolean;
		absaFormComplete: boolean;
		notes?: string;
		timestamp: string;
	};
};

type ContractSignedEvent = {
	data: {
		workflowId: number;
		contractUrl?: string;
		signedAt: string;
	};
};

type FicaUploadEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		documents: Array<{
			type: "BANK_STATEMENT" | "ACCOUNTANT_LETTER" | "ID_DOCUMENT" | "PROOF_OF_ADDRESS";
			filename: string;
			url: string;
			uploadedAt: string;
		}>;
	};
};

// ============================================
// Constants
// ============================================

const OVERLIMIT_THRESHOLD = 500_000_00; // R500,000 in cents

const MANDATE_DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
	EFT: ["BANK_CONFIRMATION", "MANDATE_FORM"],
	DEBIT_ORDER: ["DEBIT_ORDER_MANDATE", "BANK_CONFIRMATION"],
	CASH: ["PROOF_OF_REGISTRATION"],
	MIXED: ["BANK_CONFIRMATION", "MANDATE_FORM", "DEBIT_ORDER_MANDATE"],
};

// ============================================
// Helper Functions
// ============================================

async function checkOverlimit(quoteAmount: number): Promise<{
	isOverlimit: boolean;
	threshold: number;
	amount: number;
}> {
	return {
		isOverlimit: quoteAmount > OVERLIMIT_THRESHOLD,
		threshold: OVERLIMIT_THRESHOLD,
		amount: quoteAmount,
	};
}

function determineMandateRequirements(mandateType: string): {
	requiredDocuments: string[];
	requiresProcurementCheck: boolean;
} {
	const requiredDocuments = MANDATE_DOCUMENT_REQUIREMENTS[mandateType] || ["MANDATE_FORM"];
	// Procurement check required for EFT and MIXED mandates
	const requiresProcurementCheck = mandateType === "EFT" || mandateType === "MIXED";

	return { requiredDocuments, requiresProcurementCheck };
}

// Map workflow mandate types to V24 mandate types
function mapToV24MandateType(mandateType: string): "EFT" | "NAEDO" | "DEBICHECK" | "AVSR" {
	const mapping: Record<string, "EFT" | "NAEDO" | "DEBICHECK" | "AVSR"> = {
		EFT: "EFT",
		DEBIT_ORDER: "NAEDO",
		CASH: "EFT", // Default to EFT for cash
		MIXED: "DEBICHECK",
	};
	return mapping[mandateType] || "EFT";
}

// ============================================
// Main Onboarding Workflow V2
// ============================================

export const onboardingWorkflowV2 = inngest.createFunction(
	{
		id: "stratcol-client-onboarding-v2",
		name: "StratCol Client Onboarding V2",
		retries: 3,
	},
	{ event: "onboarding/lead.created" },
	async ({ event, step }) => {
		const { applicantId, workflowId } = event.data;

		// ================================================================
		// STAGE 1: Applicant Entry & Verification
		// ================================================================

		// Step 1.1: Blacklist Check
		await step.run("verification-veto-check", async () => {
			if (blacklist.includes(applicantId)) {
				const message = `[Veto] Applicant ${applicantId} is blacklisted. Workflow terminated.`;
				console.error(message);

				await logWorkflowEvent({
					workflowId,
					eventType: "error",
					payload: { error: "Applicant Blacklisted", reason: "Manual Veto" },
				});

				await updateWorkflowStatus(workflowId, "failed", 1);
				throw new NonRetriableError(message);
			}
		});

		await step.run("stage-1-start", () => updateWorkflowStatus(workflowId, "processing", 1));

		// Step 1.2: AI Calculate Quotation (replaces ITC check as primary)
		// This step calculates quote AND checks for overlimits
		const quotationResult = await step.run("ai-calculate-quotation", async () => {
			// First, run ITC check for credit scoring
			const itcResult = await performITCCheck({ applicantId, workflowId });

			// Log ITC result
			await logWorkflowEvent({
				workflowId,
				eventType: "itc_check_completed",
				payload: {
					creditScore: itcResult.creditScore,
					recommendation: itcResult.recommendation,
					passed: itcResult.passed,
				},
			});

			// Generate quote using AI
			const quoteResult = await generateQuote(applicantId, workflowId);

			if (!quoteResult.success || !quoteResult.quote) {
				return {
					success: false as const,
					error: quoteResult.error || "Quote generation failed",
					itcResult,
					quote: null as Quote | null,
					overlimitCheck: null as { isOverlimit: boolean; threshold: number; amount: number } | null,
				};
			}

			// Check overlimit
			const overlimitCheck = await checkOverlimit(quoteResult.quote.amount);

			return {
				success: true as const,
				quote: quoteResult.quote,
				itcResult,
				overlimitCheck,
				error: null as string | null,
			};
		});

		// Handle quotation failure
		if (!quotationResult.success) {
			const errorMessage = quotationResult.error || "Failed to generate quotation";
			
			await step.run("quotation-failed-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "error",
					title: "Quotation Generation Failed",
					message: errorMessage,
					actionable: true,
				})
			);

			await step.run("quotation-failed-status", () =>
				updateWorkflowStatus(workflowId, "paused", 1)
			);

			return {
				status: "failed",
				stage: 1,
				reason: errorMessage,
			};
		}

		const { quote, overlimitCheck } = quotationResult;

		// Log quote generation
		await step.run("log-quote-generated", () =>
			logWorkflowEvent({
				workflowId,
				eventType: "quote_generated",
				payload: {
					quoteId: quote?.quoteId,
					amount: quote?.amount,
					baseFeePercent: quote?.baseFeePercent,
					adjustedFeePercent: quote?.adjustedFeePercent,
					isOverlimit: overlimitCheck?.isOverlimit,
				},
			})
		);

		// Step 1.3: Manager Review Quote (with overlimit handling)
		await step.run("stage-1-awaiting-manager-review", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 1)
		);

		// Notify manager about quote - highlight if overlimit
		await step.run("notify-manager-quote-review", async () => {
			const isOverlimit = overlimitCheck?.isOverlimit || false;
			const title = isOverlimit
				? "OVERLIMIT: Quote Requires Special Approval"
				: "Quote Ready for Approval";

			const message = isOverlimit
				? `Quote amount R${((quote?.amount || 0) / 100).toFixed(2)} exceeds threshold of R${(OVERLIMIT_THRESHOLD / 100).toFixed(2)}. Special approval required.`
				: `AI-generated quote for R${((quote?.amount || 0) / 100).toFixed(2)} is ready for review.`;

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: isOverlimit ? "warning" : "awaiting",
				title,
				message,
				actionable: true,
			});

			await sendInternalAlertEmail({
				title,
				message,
				workflowId,
				applicantId,
				type: isOverlimit ? "warning" : "info",
				actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/applicants/${applicantId}`,
			});
		});

		// Wait for manager decision (approve or reject)
		const managerDecision = await step.waitForEvent("wait-for-manager-decision", {
			event: "quote/approved",
			timeout: "30d",
			match: "data.workflowId",
		}) as QuoteApprovedEvent | null;

		// Also check for rejection event (race condition handled by Inngest)
		// In practice, we wait for approved. If rejected, a separate path handles it.

		if (!managerDecision) {
			await step.run("manager-decision-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 1)
			);

			await step.run("manager-decision-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Quote Approval Timeout",
					message: "Manager did not review quote within 30 days.",
					actionable: true,
				})
			);

			return {
				status: "timeout",
				stage: 1,
				reason: "Quote approval timeout",
			};
		}

		// ================================================================
		// STAGE 2: Quote Signing & Facility Application
		// ================================================================

		await step.run("stage-2-start", () => updateWorkflowStatus(workflowId, "processing", 2));

		// Step 2.1: Email Quote to Applicant
		await step.run("email-quote-to-applicant", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			const applicant = applicantResults[0];

			if (!applicant) {
				throw new Error(`Applicant ${applicantId} not found`);
			}

			// Create quote form link only
			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "SIGNED_QUOTATION" as FormType,
			});

			const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
			const quoteLink = `${baseUrl}/forms/${token}`;

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "SIGNED_QUOTATION", url: quoteLink }],
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "quote_sent",
				payload: { email: applicant.email, quoteId: quote?.quoteId },
			});
		});

		await step.run("stage-2-awaiting-quote-signature", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Step 2.2: Wait for Quote Signature
		const quoteSignedEvent = await step.waitForEvent("wait-for-quote-signed", {
			event: "quote/signed",
			timeout: "30d",
			match: "data.workflowId",
		}) as QuoteSignedEvent | null;

		if (!quoteSignedEvent) {
			await step.run("quote-signature-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2)
			);

			await step.run("quote-signature-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Quote Signature Timeout",
					message: "Applicant did not sign quote within 30 days.",
					actionable: true,
				})
			);

			return {
				status: "timeout",
				stage: 2,
				reason: "Quote signature timeout",
			};
		}

		// Step 2.3: Request Facility Application ONLY (not all forms)
		await step.run("request-facility-application", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			const applicant = applicantResults[0];

			if (!applicant) {
				throw new Error(`Applicant ${applicantId} not found`);
			}

			// Create facility application link only
			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "FACILITY_APPLICATION" as FormType,
			});

			const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
			const facilityLink = `${baseUrl}/forms/${token}`;

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "FACILITY_APPLICATION", url: facilityLink }],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Facility Application Sent",
				message: "Applicant has been sent the facility application form.",
				actionable: false,
			});
		});

		await step.run("stage-2-awaiting-facility-app", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Step 2.4: Wait for Facility Application
		const facilityFormEvent = await step.waitForEvent("wait-for-facility-app", {
			event: "form/facility.submitted",
			timeout: "14d",
			match: "data.workflowId",
		}) as FacilityFormSubmittedEvent | null;

		if (!facilityFormEvent) {
			await step.run("facility-app-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2)
			);

			await step.run("facility-app-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Facility Application Timeout",
					message: "Applicant did not submit facility application within 14 days.",
					actionable: true,
				})
			);

			return {
				status: "timeout",
				stage: 2,
				reason: "Facility application timeout",
			};
		}

		// ================================================================
		// STAGE 3: Mandate Determination & Parallel Processing
		// ================================================================

		await step.run("stage-3-start", () => updateWorkflowStatus(workflowId, "processing", 3));

		// Step 3.1: Determine Mandate Type from Facility Application
		const mandateInfo = await step.run("determine-mandate-type", async () => {
			const { formData } = facilityFormEvent.data;
			const { requiredDocuments, requiresProcurementCheck } = determineMandateRequirements(
				formData.mandateType
			);

			await logWorkflowEvent({
				workflowId,
				eventType: "mandate_determined",
				payload: {
					mandateType: formData.mandateType,
					mandateVolume: formData.mandateVolume,
					requiredDocuments,
					requiresProcurementCheck,
				},
			});

			// Update applicant with mandate info
			const db = getDatabaseClient();
			if (db) {
				await db
					.update(applicants)
					.set({
						mandateType: formData.mandateType,
						mandateVolume: formData.mandateVolume,
					})
					.where(eq(applicants.id, applicantId));
			}

			return {
				mandateType: formData.mandateType,
				mandateVolume: formData.mandateVolume,
				requiredDocuments,
				requiresProcurementCheck,
			};
		});

		// Step 3.2: Parallel Execution - Branch A (Procurement) and Branch B (Documents)
		// Using Promise.all pattern for parallel Inngest steps

		// Branch A: Procurement Check (if required)
		const procurementPromise = mandateInfo.requiresProcurementCheck
			? step.run("run-procurement-check", async () => {
					const result = await analyzeRisk(applicantId);

					await logWorkflowEvent({
						workflowId,
						eventType: "procurement_check_completed",
						payload: {
							riskScore: result.riskScore,
							anomalies: result.anomalies,
							recommendedAction: result.recommendedAction,
						},
					});

					// If high risk, alert risk manager immediately
					if (result.recommendedAction !== "APPROVE") {
						await sendInternalAlertEmail({
							title: `Procurement Alert: ${result.recommendedAction}`,
							message: `ProcureCheck flagged this applicant. Score: ${result.riskScore}. Anomalies: ${result.anomalies.join(", ")}`,
							workflowId,
							applicantId,
							type: "warning",
							actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/applicants/${applicantId}`,
						});
					}

					return result;
				})
			: Promise.resolve(null);

		// Branch B: Request Mandate Documents
		const mandateDocsPromise = step.run("request-mandate-documents", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			const applicant = applicantResults[0];

			if (!applicant) {
				throw new Error(`Applicant ${applicantId} not found`);
			}

			// Create document upload link
			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "DOCUMENT_UPLOADS" as FormType,
			});

			const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
			const uploadLink = `${baseUrl}/uploads/${token}`;

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "DOCUMENT_UPLOADS", url: uploadLink }],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Mandate Documents Required",
				message: `Please upload the following documents: ${mandateInfo.requiredDocuments.join(", ")}`,
				actionable: true,
			});

			return { requestSent: true, requiredDocuments: mandateInfo.requiredDocuments };
		});

		// Execute both branches
		const [procurementResult, mandateDocsRequest] = await Promise.all([
			procurementPromise,
			mandateDocsPromise,
		]);

		// Step 3.3: Wait for Risk Manager Review (if procurement check flagged issues)
		let procurementDecision: { outcome: "CLEARED" | "DENIED"; reason?: string } = {
			outcome: "CLEARED",
		};

		if (procurementResult && procurementResult.recommendedAction !== "APPROVE") {
			await step.run("stage-3-awaiting-procurement-review", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 3)
			);

			await step.run("notify-risk-manager-procurement", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Procurement Review Required",
					message: `Risk score: ${procurementResult.riskScore}. Anomalies: ${procurementResult.anomalies.join(", ")}`,
					actionable: true,
				})
			);

			const riskReviewEvent = await step.waitForEvent("wait-for-procurement-review", {
				event: "risk/procurement.completed",
				timeout: "7d",
				match: "data.workflowId",
			}) as ProcurementCompletedEvent | null;

			if (!riskReviewEvent) {
				// Default to manual review required
				procurementDecision = { outcome: "DENIED", reason: "Review timeout" };
			} else {
				procurementDecision = riskReviewEvent.data.decision;
			}
		}

		// Check if procurement was denied
		if (procurementDecision.outcome === "DENIED") {
			await step.run("procurement-denied-update", () =>
				updateWorkflowStatus(workflowId, "failed", 3)
			);

			await step.run("procurement-denied-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "failed",
					title: "Application Denied - Procurement Check",
					message: procurementDecision.reason || "Failed procurement verification",
					actionable: false,
				})
			);

			return {
				status: "denied",
				stage: 3,
				reason: procurementDecision.reason || "Procurement check failed",
			};
		}

		// Step 3.4: Wait for Mandate Documents
		const mandateDocsEvent = await step.waitForEvent("wait-for-mandate-docs", {
			event: "document/mandate.submitted",
			timeout: "14d",
			match: "data.workflowId",
		}) as MandateDocumentsSubmittedEvent | null;

		if (!mandateDocsEvent) {
			await step.run("mandate-docs-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 3)
			);

			await step.run("mandate-docs-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Mandate Documents Timeout",
					message: "Required documents not received within 14 days.",
					actionable: true,
				})
			);

			return {
				status: "timeout",
				stage: 3,
				reason: "Mandate documents timeout",
			};
		}

		// ================================================================
		// STAGE 4: AI Analysis & Final Review
		// (Continues in Phase 3 implementation)
		// ================================================================

		await step.run("stage-4-start", () => updateWorkflowStatus(workflowId, "processing", 4));

		// Step 4.1: Request FICA Documents for AI Analysis
		await step.run("request-fica-documents", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			const applicant = applicantResults[0];

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "FICA Documents Required",
				message: "Please upload 3 months bank statements and accountant letter for verification.",
				actionable: true,
			});
		});

		// Step 4.2: Wait for FICA Documents
		const ficaUploadEvent = await step.waitForEvent("wait-for-fica-documents", {
			event: "upload/fica.received",
			timeout: "14d",
			match: "data.workflowId",
		}) as FicaUploadEvent | null;

		if (!ficaUploadEvent) {
			await step.run("fica-docs-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 4)
			);

			return {
				status: "timeout",
				stage: 4,
				reason: "FICA document upload timeout",
			};
		}

		// Step 4.3: AI Analysis - Bank Validation, Sanctions, Risk
		const aiAnalysisResult = await step.run("run-ai-analysis", async () => {
			const documents = ficaUploadEvent.data.documents;
			const bankStatement = documents.find(d => d.type === "BANK_STATEMENT");

			if (!bankStatement) {
				throw new Error("Bank statement not found in uploaded documents");
			}

			// Run FICA analysis
			const ficaAnalysis = await analyzeBankStatement({
				content: bankStatement.url,
				contentType: "text",
				workflowId,
			});

			// Aggregate results
			const aggregatedScore = ficaAnalysis.aiTrustScore;
			const recommendation = canAutoApproveFica(ficaAnalysis) ? "APPROVE" : "MANUAL_REVIEW";

			await logWorkflowEvent({
				workflowId,
				eventType: "ai_analysis_completed",
				payload: {
					aiTrustScore: ficaAnalysis.aiTrustScore,
					recommendation,
					riskFlagsCount: ficaAnalysis.riskFlags.length,
					nameMatchVerified: ficaAnalysis.nameMatchVerified,
					accountMatchVerified: ficaAnalysis.accountMatchVerified,
				},
			});

			return {
				ficaAnalysis,
				aggregatedScore,
				recommendation,
			};
		});

		// Step 4.4: Final Risk Manager Review
		let finalRiskDecision: {
			outcome: "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO";
			decidedBy: string;
			reason?: string;
		};

		if (aiAnalysisResult.recommendation === "APPROVE") {
			finalRiskDecision = {
				outcome: "APPROVED",
				decidedBy: "ai_auto_approval",
				reason: `Auto-approved: AI Trust Score ${aiAnalysisResult.aggregatedScore}%`,
			};
		} else {
			await step.run("stage-4-awaiting-final-review", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 4)
			);

			await step.run("notify-risk-manager-final", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Final Risk Review Required",
					message: `AI Trust Score: ${aiAnalysisResult.aggregatedScore}%. Manual review required.`,
					actionable: true,
				})
			);

			await step.run("email-risk-manager-final", () =>
				sendInternalAlertEmail({
					title: "Final Risk Review Required",
					message: `Applicant requires final risk review. AI Trust Score: ${aiAnalysisResult.aggregatedScore}%.`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/applicants/${applicantId}`,
				})
			);

			const riskEvent = await step.waitForEvent("wait-for-final-risk-decision", {
				event: "risk/decision.received",
				timeout: "7d",
				match: "data.workflowId",
			}) as RiskDecisionEvent | null;

			if (!riskEvent) {
				await step.run("final-review-timeout", () =>
					updateWorkflowStatus(workflowId, "timeout", 4)
				);

				return {
					status: "timeout",
					stage: 4,
					reason: "Final risk review timeout",
				};
			}

			finalRiskDecision = riskEvent.data.decision;
		}

		// Handle rejection
		if (finalRiskDecision.outcome === "REJECTED") {
			await step.run("final-rejected-update", () =>
				updateWorkflowStatus(workflowId, "failed", 4)
			);

			await step.run("final-rejected-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "failed",
					title: "Application Rejected",
					message: finalRiskDecision.reason || "Rejected during final review",
					actionable: false,
				})
			);

			return {
				status: "rejected",
				stage: 4,
				reason: finalRiskDecision.reason,
				decidedBy: finalRiskDecision.decidedBy,
			};
		}

		// ================================================================
		// STAGE 5: Contract & Absa Form, Final Approval
		// ================================================================

		await step.run("stage-5-start", () => updateWorkflowStatus(workflowId, "processing", 5));

		// Step 5.1: Request Contract Signature and Absa Form
		await step.run("request-contract-and-absa", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			const applicant = applicantResults[0];

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			// Create contract and Absa form links
			const contractToken = await createFormInstance({
				applicantId,
				workflowId,
				formType: "STRATCOL_CONTRACT" as FormType,
			});

			const absaToken = await createFormInstance({
				applicantId,
				workflowId,
				formType: "ABSA_6995" as FormType,
			});

			const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [
					{ formType: "STRATCOL_CONTRACT", url: `${baseUrl}/forms/${contractToken.token}` },
					{ formType: "ABSA_6995", url: `${baseUrl}/forms/${absaToken.token}` },
				],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Contract & Banking Forms Sent",
				message: "Please sign the contract and complete the Absa 6995 form.",
				actionable: false,
			});
		});

		await step.run("stage-5-awaiting-forms", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 5)
		);

		// Step 5.2: Wait for Contract Signature
		const contractEvent = await step.waitForEvent("wait-for-contract-signed", {
			event: "contract/signed",
			timeout: "7d",
			match: "data.workflowId",
		}) as ContractSignedEvent | null;

		if (!contractEvent) {
			await step.run("contract-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 5)
			);

			return {
				status: "timeout",
				stage: 5,
				reason: "Contract signing timeout",
			};
		}

		// Step 5.3: Wait for Final Approval Button (Manual)
		await step.run("stage-5-awaiting-final-approval", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 5)
		);

		await step.run("notify-final-approval-ready", () =>
			createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Ready for Final Approval",
				message: "All documents received. Click approve to complete onboarding.",
				actionable: true,
			})
		);

		const finalApprovalEvent = await step.waitForEvent("wait-for-final-approval", {
			event: "onboarding/final-approval.received",
			timeout: "7d",
			match: "data.workflowId",
		}) as FinalApprovalEvent | null;

		if (!finalApprovalEvent) {
			await step.run("final-approval-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 5)
			);

			return {
				status: "timeout",
				stage: 5,
				reason: "Final approval timeout",
			};
		}

		// ================================================================
		// STAGE 6: Integration & Completion
		// ================================================================

		await step.run("stage-6-start", () => updateWorkflowStatus(workflowId, "processing", 6));

		// Step 6.1: V24 Integration
		const v24Result = await step.run("v24-create-client", async () => {
			return createV24ClientProfile({
				applicantId,
				workflowId,
				mandateType: mapToV24MandateType(mandateInfo.mandateType),
				approvedVolume: mandateInfo.mandateVolume,
				feePercent: quote?.adjustedFeePercent || quote?.baseFeePercent || 150,
			});
		});

		if (!v24Result.success) {
			await step.run("v24-error-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "error",
					title: "V24 Integration Error",
					message: v24Result.error || "Failed to create client in V24",
					actionable: true,
				})
			);
			// Don't fail workflow, just log
		} else {
			await step.run("log-v24-success", () =>
				logWorkflowEvent({
					workflowId,
					eventType: "v24_integration_completed",
					payload: {
						clientId: v24Result.clientId,
						v24Reference: v24Result.v24Reference,
					},
				})
			);
		}

		// Step 6.2: Schedule Training & Send Welcome Pack
		const trainingSession = await step.run("schedule-training", async () => {
			const db = getDatabaseClient();
			const applicantResults = db
				? await db.select().from(applicants).where(eq(applicants.id, applicantId))
				: [];
			const applicant = applicantResults[0];

			return scheduleTrainingSession({
				email: applicant?.email || "client@example.com",
				clientName: applicant?.companyName || "Client",
			});
		});

		await step.run("send-welcome-pack", async () => {
			const db = getDatabaseClient();
			const applicantResults = db
				? await db.select().from(applicants).where(eq(applicants.id, applicantId))
				: [];
			const applicant = applicantResults[0];

			return sendWelcomePack({
				email: applicant?.email || "client@example.com",
				clientName: applicant?.companyName || "Client",
				v24Reference: v24Result.v24Reference || `SC-${workflowId}`,
				portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
				temporaryPassword: generateTemporaryPassword(),
			});
		});

		// Step 6.3: Mark Complete
		await step.run("workflow-complete", () =>
			updateWorkflowStatus(workflowId, "completed", 6)
		);

		await step.run("workflow-complete-notify", () =>
			createWorkflowNotification({
				workflowId,
				applicantId,
				type: "success",
				title: "Onboarding Complete",
				message: "Client onboarding has been successfully completed.",
				actionable: false,
			})
		);

		return {
			status: "completed",
			stage: 6,
			v24Reference: v24Result.v24Reference,
			trainingSessionId: trainingSession.sessionId,
			approvedBy: finalApprovalEvent.data.approvedBy,
		};
	}
);
