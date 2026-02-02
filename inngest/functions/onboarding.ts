/**
 * StratCol Onboarding Workflow - Complete Saga Implementation
 *
 * This is the main workflow for client onboarding following the StratCol
 * Risk Management Modernization Plan. It implements:
 *
 * Stage 1: Applicant Capture & Commitment (Zero-Entry Application)
 * Stage 2: Dynamic Quotation & ITC Check (Paperwork Cascade)
 * Stage 3: Intelligent Verification & AI FICA Analysis (Digital Forensic Lab)
 * Stage 4: Integration & V24 Handover (Activation)
 *
 * Business Rules:
 * - ITC Score < 100: Auto-decline or route to manual review
 * - AI Trust Score >= 80%: Auto-approve
 * - AI Trust Score < 80%: Risk Manager (Paula) reviews
 * - 14-day timeout for FICA document uploads
 */
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import {
	analyzeBankStatement,
	canAutoApprove as canAutoApproveFica,
} from "@/lib/services/fica-ai.service";
import { generateFormLinks, sendFormLinksEmail } from "@/lib/services/form-link.service";
import { performITCCheck, shouldAutoDecline } from "@/lib/services/itc.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote } from "@/lib/services/quote.service";
import type { QuoteResult } from "@/lib/services/quote.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import {
	createV24ClientProfile,
	generateTemporaryPassword,
	scheduleTrainingSession,
	sendWelcomePack,
} from "@/lib/services/v24.service";
import { AI_TRUST_THRESHOLDS, ITC_THRESHOLDS } from "@/lib/types";
import type { FicaDocumentAnalysis } from "@/lib/types";
import { inngest } from "../client";
import blacklist from "../data/mock_blacklist.json";
import { sendInternalAlertEmail } from "@/lib/services/email.service";

// ============================================
// Helper: Safe Step Execution with HITL
// ============================================

type WorkflowResolutionEvent = {
	data: {
		action: "retry" | "cancel" | "continue";
		decision?: {
			agentId: string;
			outcome: "APPROVED" | "REJECTED";
			reason?: string;
			timestamp: string;
		};
	};
};

type QuoteApprovedEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		quoteId: number;
		approvedAt: string;
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

type ContractSignedEvent = {
	data: {
		workflowId: number;
		contractUrl?: string;
		signedAt: string;
	};
};

type FicaUploadDocument = {
	type: "BANK_STATEMENT" | "ACCOUNTANT_LETTER" | "ID_DOCUMENT" | "PROOF_OF_ADDRESS";
	filename: string;
	url: string;
	uploadedAt: string;
};

type FicaUploadEvent = {
	data: {
		workflowId: number;
		applicantId: number;
		documents: FicaUploadDocument[];
	};
};

type RiskDecisionEvent = {
	data: {
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

type ITCResult = {
	creditScore: number;
	riskCategory: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
	passed: boolean;
	recommendation:
		| "AUTO_APPROVE"
		| "MANUAL_REVIEW"
		| "AUTO_DECLINE"
		| "ENHANCED_DUE_DILIGENCE";
};

async function runSafeStep<T>(
	step: unknown,
	stepId: string,
	operation: () => Promise<T>,
	context: { workflowId: number; applicantId: number; stage: number }
): Promise<T | null> {
	const stepInstance = step as {
		run: (id: string, op: () => Promise<unknown>) => Promise<unknown>;
		waitForEvent: (id: string, options: Record<string, unknown>) => Promise<unknown>;
	};

	try {
		return (await stepInstance.run(stepId, operation)) as T;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[Workflow] Step ${stepId} failed:`, errorMessage);

		// Log error event
		await stepInstance.run(`${stepId}-log-error`, () =>
			logWorkflowEvent({
				workflowId: context.workflowId,
				eventType: "error",
				payload: { step: stepId, error: errorMessage, stage: context.stage },
			})
		);

		// Create notification
		await stepInstance.run(`${stepId}-notify-error`, () =>
			createWorkflowNotification({
				workflowId: context.workflowId,
				applicantId: context.applicantId,
				type: "error",
				title: "Workflow Error - Action Required",
				message: `Step "${stepId}" failed: ${errorMessage}`,
				actionable: true,
				errorDetails: { step: stepId, error: errorMessage },
			})
		);

		// Pause workflow status
		await stepInstance.run(`${stepId}-set-paused`, () =>
			updateWorkflowStatus(context.workflowId, "paused", context.stage)
		);

		// Wait for HITL resolution
		const resolution = (await stepInstance.waitForEvent(`${stepId}-wait-resolution`, {
			event: "workflow/error-resolved",
			timeout: "30d",
			match: "data.workflowId",
		})) as WorkflowResolutionEvent | null;

		if (!resolution || resolution.data.action === "cancel") {
			await stepInstance.run(`${stepId}-handle-cancel`, () =>
				updateWorkflowStatus(context.workflowId, "failed", context.stage)
			);
			throw new Error(`Workflow cancelled at step ${stepId}: ${errorMessage}`);
		}

		if (resolution.data.action === "retry") {
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
	{ id: "stratcol-client-onboarding", name: "StratCol Client Onboarding" },
	{ event: "onboarding/lead.created" },
	async ({ event, step }) => {
		const { applicantId, workflowId } = event.data;

		console.log(`[Workflow] STARTED for applicant=${applicantId} workflow=${workflowId}`);

		// ================================================================
		// Verification Veto Check (Blacklist)
		// ================================================================
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

		// ================================================================
		// STAGE 1: Applicant Capture & Commitment
		// ================================================================
		await runSafeStep(
			step,
			"stage-1-processing",
			() => updateWorkflowStatus(workflowId, "processing", 1),
			{
				workflowId,
				applicantId,
				stage: 1,
			}
		);

		// (Zapier webhooks removed - using direct Inngest events)

		// ================================================================
		// STEP: ITC Credit Check (SOP Step 2.1)
		// Mock API call to credit bureau. If score < 100, auto-decline
		// ================================================================
		const itcResult = (await step.run("run-itc-check", async () => {
			console.log(`[Workflow] Running ITC credit check for applicant ${applicantId}`);
			return performITCCheck({ applicantId, workflowId });
		})) as unknown as ITCResult;

		// Log ITC result
		await step.run("log-itc-result", () =>
			logWorkflowEvent({
				workflowId,
				eventType: "stage_change",
				payload: {
					step: "itc-check",
					creditScore: itcResult.creditScore,
					recommendation: itcResult.recommendation,
					passed: itcResult.passed,
				},
			})
		);

		// Handle ITC decision
		if (shouldAutoDecline(itcResult)) {
			console.log(
				`[Workflow] ITC Auto-Decline: Score ${itcResult.creditScore} < ${ITC_THRESHOLDS.AUTO_DECLINE}`
			);

			await step.run("itc-decline-update", () =>
				updateWorkflowStatus(workflowId, "failed", 1)
			);

			await step.run("itc-decline-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "failed",
					title: "Application Declined - Credit Check",
					message: `ITC credit score (${itcResult.creditScore}) below minimum threshold.`,
					actionable: false,
				})
			);

			return {
				status: "declined",
				stage: 1,
				reason: "ITC credit check failed",
				creditScore: itcResult.creditScore,
			};
		}

		// ================================================================
		// STAGE 2: Dynamic Quotation & Quality Gating (Paperwork Cascade)
		// ================================================================
		await runSafeStep(
			step,
			"stage-2-processing",
			() => updateWorkflowStatus(workflowId, "processing", 2),
			{
				workflowId,
				applicantId,
				stage: 2,
			}
		);

		// Generate quote based on ITC result and applicant data
		const quoteResult = (await step.run("generate-legal-pack", () =>
			generateQuote(applicantId, workflowId)
		)) as unknown as QuoteResult;

		const quote = quoteResult.quote;

		// Handle quote error with HITL
		if (!quoteResult.success || !quote) {
			const errorMessage = quoteResult.error || "Quote generation failed";

			await step.run("stage-2-quote-error-log", () =>
				logWorkflowEvent({
					workflowId,
					eventType: "error",
					payload: { step: "generate-legal-pack", error: errorMessage },
				})
			);

			await step.run("stage-2-quote-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "error",
					title: "Quote Generation Failed",
					message: errorMessage,
					actionable: true,
					errorDetails: { error: errorMessage },
				})
			);

			await step.run("stage-2-quote-pause", () =>
				updateWorkflowStatus(workflowId, "paused", 2)
			);

			const resolution = await step.waitForEvent("stage-2-quote-wait-resolution", {
				event: "workflow/error-resolved",
				match: "data.workflowId",
				timeout: "30d",
			});

			if (!resolution || resolution.data.action === "cancel") {
				await step.run("stage-2-quote-cancel", () =>
					updateWorkflowStatus(workflowId, "failed", 2)
				);
				return { status: "failed", error: errorMessage };
			}

			if (resolution.data.action === "retry") {
				throw new Error("Retrying quote generation...");
			}
		}

		await step.run("stage-2-quote-created", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		await step.run("stage-2-quote-notify", () =>
			createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Quote ready for approval",
				message: "AI-generated quote is ready for staff review and approval.",
				actionable: true,
			})
		);

		await step.run("stage-2-quote-email-alert", () =>
			sendInternalAlertEmail({
				title: "Quote Ready for Approval",
				message: "A new quote generated by AI requires your review and approval.",
				workflowId,
				applicantId,
				type: "info",
				actionUrl: `https://stratcol-onboard-ai.vercel.app/dashboard/applicants/${applicantId}`,
			})
		);

		console.log("[Workflow] Waiting for staff quote approval...");
		const approvalEvent = (await step.waitForEvent("wait-for-quote-approval", {
			event: "quote/approved",
			match: "data.workflowId",
			timeout: "30d",
		})) as QuoteApprovedEvent | null;

		if (!approvalEvent) {
			await step.run("stage-2-quote-approval-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2)
			);
			await step.run("stage-2-quote-approval-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Quote approval timeout",
					message: "No staff approval received within 30 days.",
					actionable: true,
				})
			);
			return { status: "timeout", stage: 2, reason: "Quote approval timeout" };
		}

		// ================================================================
		// STEP: Send Form Links to Client (after staff approval)
		// ================================================================
		await step.run("send-form-links", async () => {
			const db = getDatabaseClient();
			if (!db) {
				throw new Error("Database connection failed");
			}

			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			const applicant = applicantResults[0];

			if (!applicant) {
				throw new Error(`Applicant ${applicantId} not found`);
			}

			const { links } = await generateFormLinks({
				applicantId,
				workflowId,
			});
			await sendFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Onboarding forms sent",
				message: "Client has received interactive forms and upload links.",
				actionable: false,
			});
		});

		await runSafeStep(
			step,
			"stage-2-awaiting-quote-signature",
			() => updateWorkflowStatus(workflowId, "awaiting_human", 2),
			{
				workflowId,
				applicantId,
				stage: 2,
			}
		);

		console.log("[Workflow] Waiting for Signed Quotation...");
		const quoteSignedEvent = (await step.waitForEvent("wait-for-quote-signed", {
			event: "quote/signed",
			match: "data.workflowId",
			timeout: "30d",
		})) as QuoteSignedEvent | null;

		if (!quoteSignedEvent) {
			console.error("[Workflow] Quote signature timeout!");
			await step.run("quote-signature-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2)
			);
			await step.run("quote-signature-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Quote signature timeout",
					message: "Client did not sign the quotation within 30 days.",
					actionable: true,
				})
			);
			return { status: "timeout", stage: 2, reason: "Quote signature timeout" };
		}

		// Wait for Contract Signing
		await runSafeStep(
			step,
			"stage-2-awaiting-contract",
			() => updateWorkflowStatus(workflowId, "awaiting_human", 2),
			{
				workflowId,
				applicantId,
				stage: 2,
			}
		);

		console.log("[Workflow] Waiting for Contract Signed signal...");
		const contractEvent = (await step.waitForEvent("wait-for-contract", {
			event: "contract/signed",
			match: "data.workflowId",
			timeout: "7d",
		})) as ContractSignedEvent | null;

		if (!contractEvent) {
			console.error("[Workflow] Contract signing timeout!");
			await step.run("contract-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2)
			);
			await step.run("contract-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "Contract Signing Timeout",
					message: "Workflow timed out waiting for contract signature.",
					actionable: true,
				})
			);
			return {
				status: "timeout",
				stage: 2,
				reason: "Contract signing timeout",
			};
		}

		console.log("[Workflow] Contract Signed!");

		// ================================================================
		// STAGE 3: Intelligent Verification (Digital Forensic Lab)
		// Wait for FICA documents, then run AI analysis
		// ================================================================
		await runSafeStep(
			step,
			"stage-3-processing",
			() => updateWorkflowStatus(workflowId, "processing", 3),
			{
				workflowId,
				applicantId,
				stage: 3,
			}
		);

		// SOP Step 2.3: Wait for FICA Documents (14-day timeout)
		console.log("[Workflow] Waiting for FICA documents (14-day timeout)...");
		await step.run("stage-3-request-fica", () =>
			createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "FICA Documents Required",
				message: "Please upload 3 months bank statements and accountant letter.",
				actionable: true,
			})
		);

		const ficaUploadEvent = (await step.waitForEvent("wait-for-documents", {
			event: "upload/fica.received",
			match: "data.workflowId",
			timeout: "14d",
		})) as FicaUploadEvent | null;

		if (!ficaUploadEvent) {
			console.error("[Workflow] FICA document upload timeout!");
			await step.run("fica-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 3)
			);
			await step.run("fica-timeout-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "timeout",
					title: "FICA Upload Timeout",
					message:
						"Client did not upload FICA documents within 14 days. Workflow paused.",
					actionable: true,
				})
			);
			return {
				status: "timeout",
				stage: 3,
				reason: "FICA document upload timeout (14 days)",
			};
		}

		const documents = ficaUploadEvent.data.documents;

		console.log("[Workflow] FICA Documents received:", documents.length, "file(s)");

		// SOP Step 2.4: AI FICA Verification (Vercel AI SDK)
		const ficaAnalysis = (await step.run("ai-fica-verification", async () => {
			console.log("[Workflow] Running AI FICA verification...");

			// Find bank statement in uploaded documents
			const bankStatement = documents.find(
				document => document.type === "BANK_STATEMENT"
			);

			if (!bankStatement) {
				throw new Error("Bank statement not found in uploaded documents");
			}

			// Analyze using Vercel AI SDK
			return analyzeBankStatement({
				content: bankStatement.url, // In production, fetch and extract content
				contentType: "text",
				workflowId,
			});
		})) as unknown as FicaDocumentAnalysis;

		// Log AI analysis result
		await step.run("log-fica-analysis", () =>
			logWorkflowEvent({
				workflowId,
				eventType: "stage_change",
				payload: {
					step: "ai-fica-verification",
					aiTrustScore: ficaAnalysis.aiTrustScore,
					recommendation: ficaAnalysis.recommendation,
					riskFlagsCount: ficaAnalysis.riskFlags.length,
					// Full analysis data for risk review UI
					summary: ficaAnalysis.summary,
					reasoning: ficaAnalysis.reasoning,
					riskFlags: ficaAnalysis.riskFlags,
					nameMatchVerified: ficaAnalysis.nameMatchVerified,
					accountMatchVerified: ficaAnalysis.accountMatchVerified,
					analysisConfidence: ficaAnalysis.analysisConfidence,
				},
			})
		);

		// SOP Step 2.5: Human Risk Review (HITL)
		// If AI Trust Score >= 80%: Auto-approve
		// If AI Trust Score < 80%: Pause for Risk Manager
		let riskDecision: {
			outcome: "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO";
			decidedBy: string;
			reason?: string;
		};

		if (canAutoApproveFica(ficaAnalysis)) {
			console.log(
				`[Workflow] Auto-approving: AI Trust Score ${ficaAnalysis.aiTrustScore} >= ${AI_TRUST_THRESHOLDS.AUTO_APPROVE}`
			);
			riskDecision = {
				outcome: "APPROVED",
				decidedBy: "ai_auto_approval",
				reason: `Auto-approved: AI Trust Score ${ficaAnalysis.aiTrustScore}%`,
			};
		} else {
			// Requires human review
			console.log(
				`[Workflow] Manual review required: AI Trust Score ${ficaAnalysis.aiTrustScore}`
			);

			await step.run("stage-3-awaiting-risk-review", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 3)
			);

			await step.run("notify-risk-manager", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "awaiting",
					title: "Risk Review Required",
					message: `AI Trust Score: ${ficaAnalysis.aiTrustScore}%. ${ficaAnalysis.riskFlags.length} risk flag(s) detected. Manual review required.`,
					actionable: true,
					errorDetails: {
						aiTrustScore: ficaAnalysis.aiTrustScore,
						riskFlags: ficaAnalysis.riskFlags,
						summary: ficaAnalysis.summary,
					},
				})
			);

			await step.run("notify-risk-manager-email", () =>
				sendInternalAlertEmail({
					title: "Risk Review Required",
					message: `Applicant requires manual risk review. AI Trust Score: ${ficaAnalysis.aiTrustScore}%.`,
					workflowId,
					applicantId,
					type: "warning",
					details: {
						riskFlags: ficaAnalysis.riskFlags.join(", "),
						score: ficaAnalysis.aiTrustScore,
					},
				})
			);

			// Wait for Risk Manager decision
			console.log("[Workflow] Waiting for Risk Manager decision...");
			const riskEvent = (await step.waitForEvent("human-risk-review", {
				event: "risk/decision.received",
				match: "data.workflowId",
				timeout: "7d",
			})) as RiskDecisionEvent | null;

			if (!riskEvent) {
				await step.run("risk-timeout", () =>
					updateWorkflowStatus(workflowId, "timeout", 3)
				);
				return {
					status: "timeout",
					stage: 3,
					reason: "Risk Manager review timeout",
				};
			}

			riskDecision = riskEvent.data.decision;
		}

		// Handle rejection
		if (riskDecision.outcome === "REJECTED") {
			console.log("[Workflow] Application REJECTED:", riskDecision.reason);

			await step.run("rejected-update", () =>
				updateWorkflowStatus(workflowId, "failed", 3)
			);

			await step.run("rejected-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "failed",
					title: "Application Rejected",
					message: riskDecision.reason || "Rejected by Risk Manager",
					actionable: false,
				})
			);

			return {
				status: "rejected",
				stage: 3,
				reason: riskDecision.reason,
				decidedBy: riskDecision.decidedBy,
			};
		}

		// Handle request for more info
		if (riskDecision.outcome === "REQUEST_MORE_INFO") {
			// Loop back to document upload
			console.log("[Workflow] Additional information requested");
			// For now, treat as timeout - in full implementation, loop back
			return {
				status: "pending_info",
				stage: 3,
				reason: riskDecision.reason,
			};
		}

		// ================================================================
		// STAGE 4: Integration & V24 Handover (Activation)
		// ================================================================
		console.log("[Workflow] Application APPROVED - Starting V24 handoff");

		await runSafeStep(
			step,
			"stage-4-processing",
			() => updateWorkflowStatus(workflowId, "processing", 4),
			{
				workflowId,
				applicantId,
				stage: 4,
			}
		);

		// SOP Step 4: V24 Integration
		// Create client profile in V24 core system
		const v24Result = await step.run("v24-create-client", async () => {
			return createV24ClientProfile({
				applicantId,
				workflowId,
				mandateType: "EFT", // Would come from facility application
				approvedVolume: 100000_00, // Would come from quote
				feePercent: 150, // 1.5% in basis points
			});
		});

		if (!v24Result.success) {
			console.error("[Workflow] V24 client creation failed:", v24Result.error);

			await step.run("v24-error-notify", () =>
				createWorkflowNotification({
					workflowId,
					applicantId,
					type: "error",
					title: "V24 Integration Error",
					message: v24Result.error || "Failed to create client in V24",
					actionable: true,
					errorDetails: { error: v24Result.error },
				})
			);

			await step.run("v24-error-email-alert", () =>
				sendInternalAlertEmail({
					title: "V24 Integration Error",
					message: "Failed to create client profile in V24 system.",
					workflowId,
					applicantId,
					type: "error",
					details: { error: v24Result.error },
				})
			);

			// Don't fail the workflow - log and continue
		} else {
			console.log("[Workflow] V24 client created:", v24Result.v24Reference);

			// Log V24 success
			await step.run("log-v24-success", () =>
				logWorkflowEvent({
					workflowId,
					eventType: "stage_change",
					payload: {
						step: "v24-integration",
						clientId: v24Result.clientId,
						v24Reference: v24Result.v24Reference,
					},
				})
			);
		}

		// Schedule training session
		const trainingSession = await step.run("schedule-training", async () => {
			// Get applicant email from database (simplified)
			return scheduleTrainingSession({
				email: "client@example.com", // Would fetch from applicant
				clientName: "Test Company", // Would fetch from applicant
			});
		});

		console.log("[Workflow] Training session scheduled:", trainingSession.sessionId);

		// Send welcome pack
		await step.run("send-welcome-pack", async () => {
			return sendWelcomePack({
				email: "client@example.com", // Would fetch from applicant
				clientName: "Test Company",
				v24Reference: v24Result.v24Reference || `SC-${workflowId}`,
				portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
				temporaryPassword: generateTemporaryPassword(),
			});
		});

		// Mark workflow complete
		await runSafeStep(
			step,
			"stage-4-complete",
			() => updateWorkflowStatus(workflowId, "completed", 4),
			{
				workflowId,
				applicantId,
				stage: 4,
			}
		);

		// (Zapier webhooks removed - using direct Inngest events)

		console.log("[Workflow] COMPLETED successfully!");

		return {
			status: "completed",
			stage: 4,
			v24Reference: v24Result.v24Reference,
			trainingSessionId: trainingSession.sessionId,
		};
	}
);
