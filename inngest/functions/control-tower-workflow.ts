/**
 * StratCol Onboarding Control Tower Workflow
 *
 * This is the PRD-aligned implementation of the onboarding workflow with:
 * - Kill Switch functionality for immediate workflow termination
 * - True parallel processing of procurement and documentation streams
 * - Conditional document logic based on business type
 * - AI agent integration (Validation, Risk, Sanctions)
 * - Human approval checkpoints with proper Inngest signal handling
 *
 * Architecture:
 * - Stream A: Procurement Risk Assessment (can trigger kill switch)
 * - Stream B: Documentation Collection & AI Analysis (runs in parallel)
 * - Synchronization Point: Both streams must complete before final review
 */

import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getDatabaseClient, getBaseUrl } from "@/app/utils";
import { applicants, quotes, workflows, workflowEvents } from "@/db/schema";
import {
	sendInternalAlertEmail,
	sendApplicantFormLinksEmail,
} from "@/lib/services/email.service";
import { createFormInstance } from "@/lib/services/form.service";
import { performITCCheck } from "@/lib/services/itc.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote, type Quote } from "@/lib/services/quote.service";
import { analyzeRisk as runProcureCheck } from "@/lib/services/risk.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import {
	isWorkflowTerminated,
	executeKillSwitch,
	type KillSwitchReason,
} from "@/lib/services/kill-switch.service";
import {
	getDocumentRequirements,
	determineBusinessType,
	type BusinessType,
} from "@/lib/services/document-requirements.service";
import { performAggregatedAnalysis } from "@/lib/services/agents";
import { inngest } from "../client";
import type { FormType } from "@/lib/types";

// ============================================
// Type Definitions
// ============================================

interface WorkflowContext {
	applicantId: number;
	workflowId: number;
	businessType?: BusinessType;
	mandateType?: string;
	mandateVolume?: number;
	procurementCleared?: boolean;
	documentsComplete?: boolean;
	aiAnalysisComplete?: boolean;
}

// ============================================
// Constants
// ============================================

const OVERLIMIT_THRESHOLD = 500_000_00; // R500,000 in cents
const WORKFLOW_TIMEOUT = "30d";
const STAGE_TIMEOUT = "14d";
const REVIEW_TIMEOUT = "7d";

// ============================================
// Kill Switch Guard
// ============================================

/**
 * Check if workflow is terminated and throw if so
 * Call this before any step that shouldn't execute after kill switch
 */
async function guardKillSwitch(workflowId: number, stepName: string): Promise<void> {
	const terminated = await isWorkflowTerminated(workflowId);
	if (terminated) {
		throw new NonRetriableError(
			`[KillSwitch] Workflow ${workflowId} terminated - stopping ${stepName}`
		);
	}
}

// ============================================
// Main Control Tower Workflow
// ============================================

export const controlTowerWorkflow = inngest.createFunction(
	{
		id: "stratcol-control-tower",
		name: "StratCol Control Tower Onboarding",
		retries: 3,
		cancelOn: [
			{
				event: "workflow/terminated",
				match: "data.workflowId",
			},
		],
	},
	{ event: "onboarding/lead.created" },
	async ({ event, step }) => {
		const { applicantId, workflowId } = event.data;
		const context: WorkflowContext = { applicantId, workflowId };

		console.log(
			`[ControlTower] Starting workflow ${workflowId} for applicant ${applicantId}`
		);

		// ================================================================
		// PHASE 1: Facility Application, ITC & Quotation
		// ================================================================

		await step.run("phase-1-start", () =>
			updateWorkflowStatus(workflowId, "processing", 1)
		);

		// Step 1.1: Send Facility Application immediately
		await step.run("send-facility-application", async () => {
			await guardKillSwitch(workflowId, "send-facility-application");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "FACILITY_APPLICATION" as FormType,
			});

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "FACILITY_APPLICATION", url: `${getBaseUrl()}/forms/${token}` }],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Facility Application Sent",
				message: "Waiting for applicant to complete facility application form",
				actionable: false,
			});
		});

		await step.run("phase-1-awaiting-facility", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 1)
		);

		// Wait for facility application submission
		const facilitySubmission = await step.waitForEvent("wait-facility-app", {
			event: "form/facility.submitted",
			timeout: STAGE_TIMEOUT,
			match: "data.workflowId",
		});

		if (!facilitySubmission) {
			return { status: "timeout", phase: 1, reason: "Facility application timeout" };
		}

		// Step 1.2: Determine mandate and update applicant record
		const mandateInfo = await step.run("determine-mandate", async () => {
			await guardKillSwitch(workflowId, "determine-mandate");

			const formData = facilitySubmission.data.formData;
			const businessType = determineBusinessType(formData as Record<string, unknown>);
			const docRequirements = getDocumentRequirements(businessType);

			context.businessType = businessType;
			context.mandateType = formData.mandateType;
			context.mandateVolume = formData.mandateVolume;

			// Update applicant record with mandate info
			const db = getDatabaseClient();
			if (db) {
				await db
					.update(applicants)
					.set({
						mandateType: formData.mandateType,
						mandateVolume: formData.mandateVolume,
						businessType: businessType,
					})
					.where(eq(applicants.id, applicantId));
			}

			await logWorkflowEvent({
				workflowId,
				eventType: "mandate_determined",
				payload: {
					businessType,
					mandateType: formData.mandateType,
					requiredDocuments: docRequirements.documents.filter(d => d.required).map(d => d.id),
				},
			});

			return {
				businessType,
				mandateType: formData.mandateType,
				mandateVolume: formData.mandateVolume,
				requiredDocuments: docRequirements.documents.filter(d => d.required),
			};
		});

		// Step 1.3: ITC check and persist to applicant
		const initialChecks = await step.run("initial-checks", async () => {
			await guardKillSwitch(workflowId, "initial-checks");

			// Run ITC check
			const itcResult = await performITCCheck({ applicantId, workflowId });

			// Persist ITC results to applicant record
			const db = getDatabaseClient();
			if (db) {
				await db
					.update(applicants)
					.set({
						itcScore: itcResult.creditScore,
						itcStatus: itcResult.recommendation,
					})
					.where(eq(applicants.id, applicantId));
			}

			await logWorkflowEvent({
				workflowId,
				eventType: "itc_check_completed",
				payload: {
					creditScore: itcResult.creditScore,
					recommendation: itcResult.recommendation,
					passed: itcResult.passed,
				},
			});

			return itcResult;
		});

		// Step 1.4: AI Generate Quotation (now with mandate and ITC data available)
		const quotationResult = await step.run("ai-generate-quote", async () => {
			await guardKillSwitch(workflowId, "ai-generate-quote");

			const result = await generateQuote(applicantId, workflowId);

			if (!result.success || !result.quote) {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "error",
					title: "Quote Generation Failed",
					message: result.error || "Failed to generate quotation",
					actionable: true,
				});
				return { success: false as const, quote: null as Quote | null, error: result.error, isOverlimit: false };
			}

			// Check overlimit
			const isOverlimit = result.quote.amount > OVERLIMIT_THRESHOLD;

			await logWorkflowEvent({
				workflowId,
				eventType: "quote_generated",
				payload: {
					quoteId: result.quote.quoteId,
					amount: result.quote.amount,
					isOverlimit,
				},
			});

			return { success: true as const, quote: result.quote, isOverlimit, error: null as string | null };
		});

		if (!quotationResult.success) {
			return { status: "failed", phase: 1, reason: quotationResult.error || "Quote generation failed" };
		}

		// Extract values after success check for cleaner code
		const { quote, isOverlimit } = quotationResult;

		// Step 1.5: Manager Quote Review
		await step.run("notify-manager-quote", async () => {
			const title = isOverlimit
				? "🚨 OVERLIMIT: Quote Requires Special Approval"
				: "Quote Ready for Approval";

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: isOverlimit ? "warning" : "awaiting",
				title,
				message: `Quote for R${((quote?.amount || 0) / 100).toFixed(2)} ready for review`,
				actionable: true,
			});

			await sendInternalAlertEmail({
				title,
				message: `Quote generated for review. Amount: R${((quote?.amount || 0) / 100).toFixed(2)}`,
				workflowId,
				applicantId,
				type: isOverlimit ? "warning" : "info",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=reviews`,
			});
		});

		await step.run("phase-1-awaiting-approval", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 1)
		);

		// Wait for manager approval
		const quoteApproval = await step.waitForEvent("wait-quote-approval", {
			event: "quote/approved",
			timeout: WORKFLOW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!quoteApproval) {
			await step.run("quote-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 1)
			);
			return { status: "timeout", phase: 1, reason: "Quote approval timeout" };
		}

		// ================================================================
		// PHASE 2: Quote Signing
		// ================================================================

		await step.run("phase-2-start", async () => {
			await guardKillSwitch(workflowId, "phase-2-start");
			return updateWorkflowStatus(workflowId, "processing", 2);
		});

		// Send quote for signature
		await step.run("send-quote-to-applicant", async () => {
			await guardKillSwitch(workflowId, "send-quote-to-applicant");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "SIGNED_QUOTATION" as FormType,
			});

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "SIGNED_QUOTATION", url: `${getBaseUrl()}/forms/${token}` }],
			});
		});

		await step.run("phase-2-awaiting-signature", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Wait for quote signature - CRITICAL trigger for Phase 3
		const quoteSigned = await step.waitForEvent("wait-quote-signed", {
			event: "quote/signed",
			timeout: WORKFLOW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!quoteSigned) {
			return { status: "timeout", phase: 2, reason: "Quote signature timeout" };
		}

		// ================================================================
		// PHASE 3: Parallel Processing Streams
		// Stream A: Procurement Check (can trigger kill switch)
		// Stream B: Document Collection & AI Analysis
		// ================================================================

		await step.run("phase-3-start", async () => {
			await guardKillSwitch(workflowId, "phase-3-start");
			return updateWorkflowStatus(workflowId, "processing", 3);
		});

		// Send Inngest event for business type determined (for external consumers)
		await step.run("emit-business-type-event", async () => {
			const docRequirements = getDocumentRequirements(mandateInfo.businessType);
			await inngest.send({
				name: "onboarding/business-type.determined",
				data: {
					workflowId,
					applicantId,
					businessType: mandateInfo.businessType,
					requiredDocuments: docRequirements.documents.filter(d => d.required).map(d => d.id),
					optionalDocuments: docRequirements.documents.filter(d => !d.required).map(d => d.id),
				},
			});
		});

		// ================================================================
		// PARALLEL STREAM A: Procurement Risk Assessment
		// ================================================================

		// Define return type for procurement stream
		interface ProcurementStreamResult {
			cleared: boolean;
			requiresReview: boolean;
			killSwitchTriggered: boolean;
			reason?: string;
			error?: string;
			result?: Awaited<ReturnType<typeof runProcureCheck>>;
		}

		const procurementStream = step.run("stream-a-procurement", async (): Promise<ProcurementStreamResult> => {
			// Check kill switch first
			const terminated = await isWorkflowTerminated(workflowId);
			if (terminated) {
				return { cleared: false, reason: "Workflow terminated", killSwitchTriggered: true, requiresReview: false };
			}

			try {
				// Run ProcureCheck
				const procureResult = await runProcureCheck(applicantId);

				await logWorkflowEvent({
					workflowId,
					eventType: "procurement_check_completed",
					payload: {
						riskScore: procureResult.riskScore,
						anomalies: procureResult.anomalies,
						recommendedAction: procureResult.recommendedAction,
					},
				});

				// If auto-approve, mark as cleared
				if (procureResult.recommendedAction === "APPROVE") {
					return { cleared: true, result: procureResult, requiresReview: false, killSwitchTriggered: false };
				}

				// If decline, trigger kill switch
				if (procureResult.recommendedAction === "REJECT") {
					// Execute kill switch
					await executeKillSwitch({
						workflowId,
						applicantId,
						reason: "PROCUREMENT_DENIED",
						decidedBy: "system_auto",
						notes: `Auto-rejected: Risk score ${procureResult.riskScore}, Anomalies: ${procureResult.anomalies.join(", ")}`,
					});
					return { cleared: false, reason: "Auto-rejected by procurement check", killSwitchTriggered: true, requiresReview: false };
				}

				// Manual review required - notify Risk Manager
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Procurement Review Required",
					message: `Risk score: ${procureResult.riskScore}. Anomalies: ${procureResult.anomalies.join(", ")}`,
					actionable: true,
				});

				await sendInternalAlertEmail({
					title: "🔍 Procurement Review Required",
					message: `Applicant requires procurement review.\nRisk Score: ${procureResult.riskScore}\nAnomalies: ${procureResult.anomalies.join(", ")}`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
				});

				return { cleared: false, result: procureResult, requiresReview: true, killSwitchTriggered: false };
			} catch (error) {
				console.error("[ControlTower] Procurement check error:", error);
				return { cleared: false, requiresReview: true, error: String(error), killSwitchTriggered: false };
			}
		});

		// ================================================================
		// PARALLEL STREAM B: Document Collection
		// ================================================================

		const documentStream = step.run("stream-b-documents", async () => {
			// Check kill switch first
			const terminated = await isWorkflowTerminated(workflowId);
			if (terminated) {
				return { requested: false, reason: "Workflow terminated" };
			}

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			// Create document upload link
			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "DOCUMENT_UPLOADS" as FormType,
			});

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "DOCUMENT_UPLOADS", url: `${getBaseUrl()}/uploads/${token}` }],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Documents Required",
				message: `Please upload required documents for ${mandateInfo.businessType} application`,
				actionable: true,
			});

			// Send Inngest event
			await inngest.send({
				name: "document/conditional-request.sent",
				data: {
					workflowId,
					applicantId,
					businessType: mandateInfo.businessType,
					documentsRequested: mandateInfo.requiredDocuments.map(d => d.id),
					sentAt: new Date().toISOString(),
				},
			});

			return { requested: true, documentCount: mandateInfo.requiredDocuments.length };
		});

		// Execute both streams in parallel
		const [procurementResult, documentResult] = await Promise.all([
			procurementStream,
			documentStream,
		]);

		// Check if kill switch was triggered by procurement
		if (procurementResult.killSwitchTriggered) {
			return {
				status: "terminated",
				phase: 3,
				reason: "Procurement check triggered kill switch",
			};
		}

		// If procurement requires review, wait for Risk Manager decision
		if (procurementResult.requiresReview) {
			await step.run("phase-3-awaiting-procurement-review", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 3)
			);

			const procurementDecision = await step.waitForEvent("wait-procurement-decision", {
				event: "risk/procurement.completed",
				timeout: REVIEW_TIMEOUT,
				match: "data.workflowId",
			});

			if (!procurementDecision) {
				// Timeout - default to deny for safety
				await executeKillSwitch({
					workflowId,
					applicantId,
					reason: "PROCUREMENT_DENIED",
					decidedBy: "system_timeout",
					notes: "Procurement review timed out after 7 days",
				});
				return { status: "terminated", phase: 3, reason: "Procurement review timeout" };
			}

			// Check decision
			if (procurementDecision.data.decision.outcome === "DENIED") {
				// Kill switch already triggered by the API endpoint
				return { status: "terminated", phase: 3, reason: "Procurement denied by Risk Manager" };
			}

			context.procurementCleared = true;
		} else {
			context.procurementCleared = procurementResult.cleared;
		}

		// Wait for documents (parallel with procurement review above if applicable)
		const mandateDocsReceived = await step.waitForEvent("wait-mandate-docs", {
			event: "document/mandate.submitted",
			timeout: STAGE_TIMEOUT,
			match: "data.workflowId",
		});

		if (!mandateDocsReceived) {
			return { status: "timeout", phase: 3, reason: "Document upload timeout" };
		}

		context.documentsComplete = true;

		// ================================================================
		// PHASE 4: AI Analysis & Risk Review
		// ================================================================

		await step.run("phase-4-start", async () => {
			await guardKillSwitch(workflowId, "phase-4-start");
			return updateWorkflowStatus(workflowId, "processing", 4);
		});

		// Request FICA documents for AI analysis
		await step.run("request-fica-docs", async () => {
			await guardKillSwitch(workflowId, "request-fica-docs");

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "FICA Documents Required",
				message: "Please upload bank statements and accountant letter for verification",
				actionable: true,
			});
		});

		// Wait for FICA documents
		const ficaDocsReceived = await step.waitForEvent("wait-fica-docs", {
			event: "upload/fica.received",
			timeout: STAGE_TIMEOUT,
			match: "data.workflowId",
		});

		if (!ficaDocsReceived) {
			return { status: "timeout", phase: 4, reason: "FICA document upload timeout" };
		}

		// Run aggregated AI analysis
		const aiAnalysis = await step.run("run-ai-analysis", async () => {
			await guardKillSwitch(workflowId, "run-ai-analysis");

			const db = getDatabaseClient();
			const [applicant] = db
				? await db.select().from(applicants).where(eq(applicants.id, applicantId))
				: [];

			const result = await performAggregatedAnalysis({
				workflowId,
				applicantId,
				applicantData: {
					companyName: applicant?.companyName || "Unknown",
					contactName: applicant?.contactName,
					registrationNumber: applicant?.registrationNumber || undefined,
					industry: applicant?.industry || undefined,
					countryCode: "ZA",
				},
				requestedAmount: context.mandateVolume,
			});

			// Send Inngest event
			await inngest.send({
				name: "agent/analysis.aggregated",
				data: {
					workflowId,
					applicantId,
					aggregatedScore: result.scores.aggregatedScore,
					canAutoApprove: result.overall.canAutoApprove,
					requiresManualReview: result.overall.requiresManualReview,
					isBlocked: result.overall.isBlocked,
					recommendation: result.overall.recommendation,
					flags: result.overall.flags,
				},
			});

			return result;
		});

		context.aiAnalysisComplete = true;

		// Check if blocked by sanctions
		if (aiAnalysis.overall.isBlocked) {
			await executeKillSwitch({
				workflowId,
				applicantId,
				reason: "COMPLIANCE_VIOLATION",
				decidedBy: "ai_sanctions_agent",
				notes: `Blocked by sanctions check: ${aiAnalysis.overall.reasoning}`,
			});
			return { status: "terminated", phase: 4, reason: "Blocked by sanctions screening" };
		}

		// Determine if auto-approve or manual review
		let finalRiskApproval: { approved: boolean; decidedBy: string; reason?: string };

		if (aiAnalysis.overall.canAutoApprove) {
			finalRiskApproval = {
				approved: true,
				decidedBy: "ai_auto_approval",
				reason: `Auto-approved: Aggregated score ${aiAnalysis.scores.aggregatedScore}%`,
			};
		} else {
			// Manual review required
			await step.run("notify-final-review", async () => {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Final Risk Review Required",
					message: `Aggregated score: ${aiAnalysis.scores.aggregatedScore}%. Flags: ${aiAnalysis.overall.flags.join(", ")}`,
					actionable: true,
				});

				await sendInternalAlertEmail({
					title: "📋 Final Risk Review Required",
					message: `Application requires final review.\nAggregated Score: ${aiAnalysis.scores.aggregatedScore}%\nRecommendation: ${aiAnalysis.overall.recommendation}\nFlags: ${aiAnalysis.overall.flags.join(", ")}`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
				});
			});

			await step.run("phase-4-awaiting-review", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 4)
			);

			const riskDecision = await step.waitForEvent("wait-risk-decision", {
				event: "risk/decision.received",
				timeout: REVIEW_TIMEOUT,
				match: "data.workflowId",
			});

			if (!riskDecision) {
				return { status: "timeout", phase: 4, reason: "Final risk review timeout" };
			}

			if (riskDecision.data.decision.outcome === "REJECTED") {
				await executeKillSwitch({
					workflowId,
					applicantId,
					reason: "MANUAL_TERMINATION",
					decidedBy: riskDecision.data.decision.decidedBy,
					notes: riskDecision.data.decision.reason,
				});
				return { status: "terminated", phase: 4, reason: "Rejected by Risk Manager" };
			}

			finalRiskApproval = {
				approved: riskDecision.data.decision.outcome === "APPROVED",
				decidedBy: riskDecision.data.decision.decidedBy,
				reason: riskDecision.data.decision.reason,
			};
		}

		// ================================================================
		// PHASE 5: Contract & Final Execution
		// ================================================================

		await step.run("phase-5-start", async () => {
			await guardKillSwitch(workflowId, "phase-5-start");
			return updateWorkflowStatus(workflowId, "processing", 5);
		});

		// Send contract and ABSA form
		await step.run("send-final-docs", async () => {
			await guardKillSwitch(workflowId, "send-final-docs");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

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

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [
					{ formType: "STRATCOL_CONTRACT", url: `${getBaseUrl()}/forms/${contractToken.token}` },
					{ formType: "ABSA_6995", url: `${getBaseUrl()}/forms/${absaToken.token}` },
				],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Final Documents Sent",
				message: "Please sign the contract and complete the ABSA bank form",
				actionable: false,
			});
		});

		await step.run("phase-5-awaiting-docs", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 5)
		);

		// Wait for contract signature
		const contractSigned = await step.waitForEvent("wait-contract-signed", {
			event: "contract/signed",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!contractSigned) {
			return { status: "timeout", phase: 5, reason: "Contract signature timeout" };
		}

		// Final approval checkpoint
		await step.run("notify-final-approval", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Ready for Final Approval",
				message: "All documents received. Click approve to complete onboarding.",
				actionable: true,
			});
		});

		const finalApproval = await step.waitForEvent("wait-final-approval", {
			event: "onboarding/final-approval.received",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!finalApproval) {
			return { status: "timeout", phase: 5, reason: "Final approval timeout" };
		}

		// ================================================================
		// COMPLETION
		// ================================================================

		await step.run("workflow-complete", async () => {
			await updateWorkflowStatus(workflowId, "completed", 5);

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "success",
				title: "Onboarding Complete",
				message: "Client onboarding has been successfully completed.",
				actionable: false,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "workflow_completed",
				payload: {
					completedAt: new Date().toISOString(),
					approvedBy: finalApproval.data.approvedBy,
					businessType: context.businessType,
					aiScore: aiAnalysis.scores.aggregatedScore,
				},
			});
		});

		return {
			status: "completed",
			phase: 5,
			workflowId,
			applicantId,
			businessType: context.businessType,
			aiScore: aiAnalysis.scores.aggregatedScore,
			approvedBy: finalApproval.data.approvedBy,
		};
	}
);

// ============================================
// Kill Switch Handler Function
// ============================================

/**
 * Handle workflow termination events
 * This function runs when kill switch is triggered to clean up
 */
export const killSwitchHandler = inngest.createFunction(
	{
		id: "stratcol-kill-switch-handler",
		name: "Kill Switch Handler",
	},
	{ event: "workflow/terminated" },
	async ({ event, step }) => {
		const { workflowId, applicantId, reason, decidedBy, terminatedAt } = event.data;

		console.log(
			`[KillSwitchHandler] Processing termination for workflow ${workflowId}`
		);

		await step.run("log-termination", async () => {
			const db = getDatabaseClient();
			if (!db) return;

			await db.insert(workflowEvents).values({
				workflowId,
				eventType: "kill_switch_handled",
				payload: JSON.stringify({
					reason,
					decidedBy,
					terminatedAt,
					handledAt: new Date().toISOString(),
				}),
			});
		});

		return {
			handled: true,
			workflowId,
			reason,
		};
	}
);
