import { type EventSchemas } from "inngest";
import type { WorkflowStatus } from "@/inngest/steps/database";
import type { FormType } from "@/db/schema";

// ============================================
// Form Types for Events
// ============================================

export type FormSubmissionType =
	| "stratcol_agreement"
	| "facility_application"
	| "absa_6995"
	| "fica_documents";

export type DocumentVerificationResult = {
	documentId: number;
	documentType: string;
	status: "verified" | "rejected" | "pending";
	reason?: string;
};

// ============================================
// Event Definitions
// ============================================

export type Events = {
	"onboarding/started": {
		data: {
			leadId: number;
			workflowId: number;
		};
	};
	"onboarding/quality-gate-passed": {
		data: {
			workflowId: number;
			approverId: string;
			timestamp: string;
		};
	};
	"onboarding/agent-callback": {
		data: {
			workflowId: number;
			decision: {
				agentId: string;
				outcome: "APPROVED" | "REJECTED";
				reason?: string;
				timestamp: string;
			};
		};
	};
	"onboarding/timeout-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			decision?: {
				agentId: string;
				outcome: "APPROVED" | "REJECTED";
				reason?: string;
				timestamp: string;
			};
		};
	};
	"onboarding/quote-generated": {
		data: {
			workflowId: number;
			leadId: number;
			quote: {
				quoteId: string;
				amount: number;
				terms: string;
			};
		};
	};
	"workflow/error-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			resolvedBy?: string; // User ID
		};
	};

	// ============================================
	// Form Submission Events
	// ============================================

	/**
	 * Fired when a form is submitted (not draft)
	 */
	"onboarding/form-submitted": {
		data: {
			workflowId: number;
			formType: FormSubmissionType;
			submissionId: number;
		};
	};

	/**
	 * Fired when all required forms for a stage are submitted
	 */
	"onboarding/forms-complete": {
		data: {
			workflowId: number;
			stage: number;
			formTypes: FormSubmissionType[];
		};
	};

	/**
	 * Fired when a form is approved during review
	 */
	"onboarding/form-approved": {
		data: {
			workflowId: number;
			formType: FormSubmissionType;
			reviewerId: string;
			timestamp: string;
		};
	};

	/**
	 * Fired when a form is rejected during review
	 */
	"onboarding/form-rejected": {
		data: {
			workflowId: number;
			formType: FormSubmissionType;
			reviewerId: string;
			reason: string;
			timestamp: string;
		};
	};

	// ============================================
	// Document Verification Events
	// ============================================

	/**
	 * Fired when documents are submitted for verification
	 */
	"onboarding/documents-submitted": {
		data: {
			workflowId: number;
			documentIds: number[];
		};
	};

	/**
	 * Fired when document verification is complete
	 */
	"onboarding/documents-verified": {
		data: {
			workflowId: number;
			verificationResults: DocumentVerificationResult[];
			allPassed: boolean;
		};
	};

	/**
	 * Fired when automated validation completes (EFS24, BizPortal, sanctions)
	 */
	"onboarding/validation-complete": {
		data: {
			workflowId: number;
			leadId: number;
			validationType: "identity" | "entity" | "risk" | "social";
			passed: boolean;
			details: Record<string, unknown>;
		};
	};
};
