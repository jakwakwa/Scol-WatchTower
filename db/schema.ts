import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

// ============================================
// Core Onboarding Tables
// ============================================

/**
 * Business Type enumeration for conditional document logic
 * Maps to document requirements in document-requirements.service.ts
 */
export const BUSINESS_TYPES = [
	"NPO",
	"PROPRIETOR",
	"COMPANY",
	"TRUST",
	"BODY_CORPORATE",
	"PARTNERSHIP",
	"CLOSE_CORPORATION",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/**
 * Applicants table - Central entity for onboarding
 */
export const applicants = pgTable("applicants", {
	id: serial("id").primaryKey(),

	// Company Info
	companyName: text("company_name").notNull(),
	tradingName: text("trading_name"),
	registrationNumber: text("registration_number"),

	// Contact Info
	contactName: text("contact_name").notNull(),
	idNumber: text("id_number"),
	email: text("email").notNull(),
	phone: text("phone"),

	// Business Classification (PRD: Conditional Document Logic)
	businessType: text("business_type"), // NPO, PROPRIETOR, COMPANY, TRUST, etc.
	entityType: text("entity_type"), // company, close_corporation, proprietor, partnership, npo, trust, body_corporate, other
	productType: text("product_type"), // standard, premium_collections, call_centre
	industry: text("industry"),
	employeeCount: integer("employee_count"),

	// Mandate Info
	mandateType: text("mandate_type"), // EFT, DEBIT_ORDER, CASH, MIXED
	mandateVolume: integer("mandate_volume"), // Max amount in cents (from facility form)
	estimatedTransactionsPerMonth: integer("estimated_transactions_per_month"), // Transaction count per month (from applicant form)

	// Status & Risk
	status: text("status").notNull().default("new"),
	riskLevel: text("risk_level"), // green, amber, red
	itcScore: integer("itc_score"),
	itcStatus: text("itc_status"),

	// SOP v3.1.0: Tiered Escalation & Sanctions
	escalationTier: integer("escalation_tier").default(1), // 1=Normal, 2=Manager Alert, 3=Salvage
	salvageDeadline: timestamp("salvage_deadline"),
	isSalvaged: boolean("is_salvaged").default(false),
	sanctionStatus: text("sanction_status", {
		enum: ["clear", "flagged", "confirmed_hit"],
	}).default("clear"),

	// System
	accountExecutive: text("account_executive"),
	notes: text("notes"),
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Documents table - Dedicated document tracking
 */
export const documents = pgTable("documents", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	type: text("type").notNull(),
	status: text("status").notNull().default("pending"),
	category: text("category"),
	source: text("source"),
	fileName: text("file_name"),
	fileContent: text("file_content"),
	mimeType: text("mime_type"),
	storageUrl: text("storage_url"),
	uploadedBy: text("uploaded_by"),
	uploadedAt: timestamp("uploaded_at"),
	verifiedAt: timestamp("verified_at"),
	processedAt: timestamp("processed_at"),
	processingStatus: text("processing_status"),
	processingResult: text("processing_result"),
	notes: text("notes"),
});

/**
 * Risk Assessments table - Application risk Profiles
 */
export const riskAssessments = pgTable("risk_assessments", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	overallScore: integer("overall_score"),
	overallStatus: text("overall_status"), // REVIEW REQUIRED, COMPLIANT, etc.
	overallRisk: text("overall_risk"), // green, amber, red

	procurementData: text("procurement_data"), // JSON
	itcData: text("itc_data"), // JSON
	sanctionsData: text("sanctions_data"), // JSON
	ficaData: text("fica_data"), // JSON

	// Specific risk factors from user schema
	cashFlowConsistency: text("cash_flow_consistency"),
	dishonouredPayments: integer("dishonoured_payments"),
	averageDailyBalance: integer("average_daily_balance"),
	accountMatchVerified: text("account_match_verified"), // yes/no or status
	letterheadVerified: text("letterhead_verified"),

	aiAnalysis: text("ai_analysis"), // JSON string, equivalent to jsonb
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at"),
	notes: text("notes"),
	createdAt: timestamp("created_at").default(new Date()),
});

/**
 * Activity Logs - General audits
 */
export const activityLogs = pgTable("activity_logs", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	action: text("action").notNull(),
	description: text("description").notNull(),
	performedBy: text("performed_by"),
	createdAt: timestamp("created_at").default(new Date()),
});

// ============================================
// Workflow Engine Tables (Keeping these for Inngest compatibility)
// ============================================

/**
 * Workflow status enumeration
 * Includes 'terminated' status for kill switch functionality
 */
export const WORKFLOW_STATUSES = [
	"pending",
	"processing",
	"awaiting_human",
	"paused",
	"completed",
	"failed",
	"timeout",
	"terminated",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

/**
 * Workflows table - Tracks onboarding workflow state
 * PRD: Kill switch sets status to 'terminated'
 */
export const workflows = pgTable("workflows", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	stage: integer("stage").default(1),
	status: text("status").default("pending"),
	startedAt: timestamp("started_at").$defaultFn(() => new Date()),
	completedAt: timestamp("completed_at"),

	// Kill Switch tracking (PRD Critical)
	terminatedAt: timestamp("terminated_at"),
	terminatedBy: text("terminated_by"),
	terminationReason: text("termination_reason"),

	// Parallel processing state
	procurementCleared: boolean("procurement_cleared"),
	documentsComplete: boolean("documents_complete"),
	aiAnalysisComplete: boolean("ai_analysis_complete"),

	// Mandate retry tracking (SOP: 7-day timeout, max 8 retries)
	mandateRetryCount: integer("mandate_retry_count").default(0),
	mandateLastSentAt: timestamp("mandate_last_sent_at"),

	// Two-factor approval tracking (Stage 6)
	riskManagerApproval: text("risk_manager_approval"), // JSON: { approvedBy, timestamp, decision }
	accountManagerApproval: text("account_manager_approval"), // JSON: { approvedBy, timestamp, decision }
	// Stage 5 one-shot gate tracking (atomic idempotency)
	contractDraftReviewedAt: timestamp("contract_draft_reviewed_at"),
	contractDraftReviewedBy: text("contract_draft_reviewed_by"),
	absaPacketSentAt: timestamp("absa_packet_sent_at"),
	absaPacketSentBy: text("absa_packet_sent_by"),
	absaApprovalConfirmedAt: timestamp("absa_approval_confirmed_at"),
	absaApprovalConfirmedBy: text("absa_approval_confirmed_by"),
	// Stage 2 sales/pre-risk + applicant decision tracking
	salesEvaluationStatus: text("sales_evaluation_status"), // pending, approved, issues_found
	salesIssuesSummary: text("sales_issues_summary"),
	issueFlaggedBy: text("issue_flagged_by"), // account_manager, ai, system
	preRiskRequired: boolean("pre_risk_required"),
	preRiskOutcome: text("pre_risk_outcome"), // approved, rejected, skipped
	preRiskEvaluatedAt: timestamp("pre_risk_evaluated_at"),
	applicantDecisionOutcome: text("applicant_decision_outcome"), // approved, declined
	applicantDeclineReason: text("applicant_decline_reason"),

	stageName: text("stage_name"),
	currentAgent: text("current_agent"),
	reviewType: text("review_type"), // procurement or general
	decisionType: text("decision_type"), // e.g. "procurement_review", "risk_review", "quote_approval", "final_approval"
	targetResource: text("target_resource"), // API endpoint path, e.g. "/api/risk-decision/procurement"

	// State Locking — Optimistic Concurrency Control (Phase 1: Ghost Process Prevention)
	// Incremented atomically on every finalized state change (human decision, kill switch, etc.)
	// Background processes must check this version before writing to detect collisions.
	stateLockVersion: integer("state_lock_version").default(0),
	stateLockedAt: timestamp("state_locked_at"),
	stateLockedBy: text("state_locked_by"), // User ID or "system"

	// Green Lane — Manual AM-triggered bypass (same path as automatic Green Lane)
	greenLaneRequestedAt: timestamp("green_lane_requested_at"),
	greenLaneRequestedBy: text("green_lane_requested_by"),
	greenLaneRequestNotes: text("green_lane_request_notes"),
	greenLaneRequestSource: text("green_lane_request_source"), // manual_am | automatic
	greenLaneConsumedAt: timestamp("green_lane_consumed_at"),

	// System
	metadata: text("metadata"),
});

// ============================================
// Risk Check Results — Source of truth for per-check lifecycle
// ============================================

export const RISK_CHECK_TYPES = [
	"PROCUREMENT",
	"ITC",
	"SANCTIONS",
	"FICA",
] as const;

export type RiskCheckType = (typeof RISK_CHECK_TYPES)[number];

export const RISK_CHECK_MACHINE_STATES = [
	"pending",
	"in_progress",
	"completed",
	"failed",
	"manual_required",
] as const;

export type RiskCheckMachineState = (typeof RISK_CHECK_MACHINE_STATES)[number];

export const RISK_CHECK_REVIEW_STATES = [
	"pending",
	"acknowledged",
	"approved",
	"rejected",
	"not_required",
] as const;

export type RiskCheckReviewState = (typeof RISK_CHECK_REVIEW_STATES)[number];

export const riskCheckResults = pgTable("risk_check_results", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	checkType: text("check_type").notNull(), // PROCUREMENT | ITC | SANCTIONS | FICA

	machineState: text("machine_state").notNull().default("pending"),
	reviewState: text("review_state").notNull().default("pending"),

	provider: text("provider"),
	externalCheckId: text("external_check_id"),

	payload: text("payload"), // JSON: check-specific result data
	rawPayload: text("raw_payload"), // JSON: raw provider response snapshot
	errorDetails: text("error_details"),

	startedAt: timestamp("started_at"),
	completedAt: timestamp("completed_at"),

	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at"),
	reviewNotes: text("review_notes"),

	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => new Date()),
});

export const NOTIFICATION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const notifications = pgTable("notifications", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id").references(() => workflows.id),
	applicantId: integer("applicant_id").references(() => applicants.id),
	type: text("type").notNull(),
	message: text("message").notNull(),
	read: boolean("read").default(false),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	actionable: boolean("actionable").default(false),
	severity: text("severity").default("medium"), // low | medium | high | critical
	groupKey: text("group_key"), // batch grouping key, e.g. "batch_failure:workflow:42"
});

export const workflowEvents = pgTable("workflow_events", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id").references(() => workflows.id),
	eventType: text("event_type").notNull(),
	payload: text("payload"),
	timestamp: timestamp("timestamp").$defaultFn(() => new Date()),
	actorType: text("actor_type").default("platform"),
	actorId: text("actor_id"),
});

/**
 * AI Feedback Logs - Structured override data for AI retraining
 *
 * Stores structured pairs: (AI said X, Human said Y because Z)
 * Every human override becomes a retrainable data point.
 * Divergence metrics enable prioritized retraining queues.
 */
export const aiFeedbackLogs = pgTable("ai_feedback_logs", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),

	// What the AI said
	aiOutcome: text("ai_outcome").notNull(), // "APPROVE" | "MANUAL_REVIEW" | "DECLINE"
	aiConfidence: integer("ai_confidence"), // 0-100
	aiCheckType: text("ai_check_type").notNull(), // "validation" | "risk" | "sanctions" | "aggregated"

	// What the human said
	humanOutcome: text("human_outcome").notNull(), // "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO"
	overrideCategory: text("override_category").notNull(), // From OVERRIDE_CATEGORIES
	overrideSubcategory: text("override_subcategory"),
	overrideDetails: text("override_details"), // Optional free text for "OTHER"

	// Divergence metrics
	isDivergent: boolean("is_divergent").notNull(),
	divergenceWeight: integer("divergence_weight"), // 1-10 priority for retraining
	divergenceType: text("divergence_type"), // "false_positive" | "false_negative" | "severity_mismatch"

	// Actor
	decidedBy: text("decided_by").notNull(),
	decidedAt: timestamp("decided_at")
		.notNull()
		.$defaultFn(() => new Date()),

	// Data lineage: links this decision to the specific failure event that triggered manual review
	relatedFailureEventId: integer("related_failure_event_id").references(
		() => workflowEvents.id
	),

	// Retraining status
	consumedForRetraining: boolean("consumed_for_retraining").default(
		false
	),
	consumedAt: timestamp("consumed_at"),
});

/**
 * Applicant Magic Link Forms - Magic link tracking
 */
export const applicantMagiclinkForms = pgTable("applicant_magiclink_forms", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id").references(() => workflows.id),
	formType: text("form_type").notNull(), // FACILITY_APPLICATION, SIGNED_QUOTATION, etc.
	status: text("status").notNull().default("pending"), // pending, sent, viewed, submitted, expired, revoked
	tokenHash: text("token_hash").notNull().unique(),
	token: text("token"),
	tokenPrefix: text("token_prefix"),
	sentAt: timestamp("sent_at"),
	viewedAt: timestamp("viewed_at"),
	expiresAt: timestamp("expires_at"),
	submittedAt: timestamp("submitted_at"),
	decisionStatus: text("decision_status"), // pending, responded
	decisionOutcome: text("decision_outcome"), // approved, declined
	decisionReason: text("decision_reason"),
	decisionAt: timestamp("decision_at"),
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Applicant Submissions - Stored form payloads
 */
export const applicantSubmissions = pgTable("applicant_submissions", {
	id: serial("id").primaryKey(),
	applicantMagiclinkFormId: integer("applicant_magiclink_form_id")
		.notNull()
		.references(() => applicantMagiclinkForms.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id").references(() => workflows.id),
	formType: text("form_type").notNull(),
	data: text("data").notNull(), // JSON string
	submittedBy: text("submitted_by"),
	version: integer("version").default(1),
	submittedAt: timestamp("submitted_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Workflow Termination Deny List - Scenario 2b: Post-Workflow Termination Ruleset
 *
 * Captures board member names and ID numbers from Risk Manager declined applicants
 * (sanction list / procurement denied). Used to detect re-applicants who reapply
 * under a different business or director's name. Matching is by ID, bank account,
 * or cellphone number — no AI, only a smart algorithm.
 */
export const workflowTerminationDenyList = pgTable("workflow_termination_deny_list", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),

	// Identifiers for re-applicant matching (normalized for comparison)
	idNumbers: text("id_numbers").notNull(), // JSON array: applicant/contact ID only
	boardMemberIds: text("board_member_ids").notNull(), // JSON array: directors/beneficial owners IDs
	cellphones: text("cellphones").notNull(), // JSON array
	bankAccounts: text("bank_accounts").notNull(), // JSON array: accountNumber + branchCode
	boardMemberNames: text("board_member_names").notNull(), // JSON array: full names

	// Metadata
	terminationReason: text("termination_reason").notNull(),
	terminatedAt: timestamp("terminated_at")
		.notNull()
		.$defaultFn(() => new Date()),
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Workflow Termination Screening - Separate table for Turso FTS/vector search
 *
 * Stores each screening value (id_number, cellphone, bank_account, board_member_name)
 * as a separate row for easy querying and Turso full-text/vector search.
 * Populated when adding to workflow_termination_deny_list.
 */
export const SCREENING_VALUE_TYPES = [
	"id_number",
	"board_member_id",
	"cellphone",
	"bank_account",
	"board_member_name",
] as const;

export type ScreeningValueType = (typeof SCREENING_VALUE_TYPES)[number];

export const workflowTerminationScreening = pgTable(
	"workflow_termination_screening",
	{
		id: serial("id").primaryKey(),
		denyListId: integer("deny_list_id")
			.notNull()
			.references(() => workflowTerminationDenyList.id, { onDelete: "cascade" }),
		valueType: text("value_type", {
			enum: SCREENING_VALUE_TYPES,
		}).notNull(),
		value: text("value").notNull(), // Normalized value for exact match and FTS indexing
		createdAt: timestamp("created_at")
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => ({
		valueTypeValueIdx: index("workflow_termination_screening_value_type_value_idx").on(
			table.valueType,
			table.value
		),
		denyListIdIdx: index("workflow_termination_screening_deny_list_id_idx").on(table.denyListId),
	})
);

/**
 * Re-Applicant Attempt Log - Records when a re-applicant is detected and denied
 */
export const reApplicantAttempts = pgTable("re_applicant_attempts", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	matchedDenyListId: integer("matched_deny_list_id")
		.notNull()
		.references(() => workflowTerminationDenyList.id),
	matchedOn: text("matched_on").notNull(), // "id_number" | "board_member_id" | "cellphone" | "bank_account" | "board_member_name"
	matchedValue: text("matched_value").notNull(),
	deniedAt: timestamp("denied_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Relations
// ============================================

export const applicantsRelations = relations(applicants, ({ many, one }) => ({
	workflows: many(workflows),
	documents: many(documents),
	applicantMagiclinkForms: many(applicantMagiclinkForms),
	applicantSubmissions: many(applicantSubmissions),
	riskAssessment: one(riskAssessments, {
		fields: [applicants.id],
		references: [riskAssessments.applicantId], // One-to-one roughly
	}),
	activityLogs: many(activityLogs),
}));

/**
 * Agent Registry - Track available external agents
 */
export const agents = pgTable("agents", {
	id: serial("id").primaryKey(),
	agentId: text("agent_id").notNull().unique(), // e.g., "xt_risk_agent_v2"
	name: text("name").notNull(),
	description: text("description"),
	webhookUrl: text("webhook_url"),
	taskType: text("task_type", {
		enum: [
			"document_generation",
			"electronic_signature",
			"risk_verification",
			"data_sync",
			"notification",
		],
	}).notNull(),
	status: text("status", { enum: ["active", "inactive", "error"] })
		.notNull()
		.default("active"),
	lastCallbackAt: timestamp("last_callback_at"),
	callbackCount: integer("callback_count").notNull().default(0),
	errorCount: integer("error_count").notNull().default(0),
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * external Callbacks - Agent callback records
 */
export const agentCallbacks = pgTable("xt_callbacks", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	eventId: text("event_id").notNull(), // From incoming webhook
	agentId: text("agent_id").notNull(), // e.g., "xt_risk_agent_v2"
	status: text("status", {
		enum: ["received", "validated", "processed", "rejected", "error"],
	})
		.notNull()
		.default("received"),
	decision: text("decision", {
		enum: ["approved", "rejected", "pending_info"],
	}),
	outcome: text("outcome"), // Full decision JSON
	rawPayload: text("raw_payload").notNull(), // Complete incoming JSON
	validationErrors: text("validation_errors"), // Any Zod errors
	humanActor: text("human_actor"), // Email of human who made decision
	processedAt: timestamp("processed_at"),
	receivedAt: timestamp("received_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Quotes table - Generated fee structures
 */
export const quotes = pgTable("quotes", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id").references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	amount: integer("amount").notNull(), // Cents
	baseFeePercent: integer("base_fee_percent").notNull(), // Basis points (e.g. 150 = 1.5%)
	adjustedFeePercent: integer("adjusted_fee_percent"), // Basis points
	details: text("details"), // JSON string with AI quote details
	rationale: text("rationale"), // AI reasoning for the fee
	status: text("status", {
		enum: ["draft", "pending_approval", "pending_signature", "approved", "rejected"],
	})
		.notNull()
		.default("draft"),
	generatedBy: text("generated_by").notNull().default("platform"), // 'system' or 'gemini'
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

export const documentsRelations = relations(documents, ({ one }) => ({
	applicant: one(applicants, {
		fields: [documents.applicantId],
		references: [applicants.id],
	}),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
	applicant: one(applicants, {
		fields: [workflows.applicantId],
		references: [applicants.id],
	}),
	quotes: many(quotes),
	events: many(workflowEvents),
	callbacks: many(agentCallbacks),
	internalForms: many(internalForms),
	documentUploads: many(documentUploads),
	signatures: many(signatures),
	aiFeedbackLogs: many(aiFeedbackLogs),
	denyListEntries: many(workflowTerminationDenyList),
}));

export const workflowTerminationDenyListRelations = relations(
	workflowTerminationDenyList,
	({ one, many }) => ({
		workflow: one(workflows, {
			fields: [workflowTerminationDenyList.workflowId],
			references: [workflows.id],
		}),
		applicant: one(applicants, {
			fields: [workflowTerminationDenyList.applicantId],
			references: [applicants.id],
		}),
		reApplicantAttempts: many(reApplicantAttempts),
		screeningValues: many(workflowTerminationScreening),
	})
);

export const workflowTerminationScreeningRelations = relations(
	workflowTerminationScreening,
	({ one }) => ({
		denyList: one(workflowTerminationDenyList, {
			fields: [workflowTerminationScreening.denyListId],
			references: [workflowTerminationDenyList.id],
		}),
	})
);

export const reApplicantAttemptsRelations = relations(
	reApplicantAttempts,
	({ one }) => ({
		applicant: one(applicants, {
			fields: [reApplicantAttempts.applicantId],
			references: [applicants.id],
		}),
		workflow: one(workflows, {
			fields: [reApplicantAttempts.workflowId],
			references: [workflows.id],
		}),
		matchedDenyList: one(workflowTerminationDenyList, {
			fields: [reApplicantAttempts.matchedDenyListId],
			references: [workflowTerminationDenyList.id],
		}),
	})
);

export const applicantMagiclinkFormsRelations = relations(
	applicantMagiclinkForms,
	({ one, many }) => ({
		applicant: one(applicants, {
			fields: [applicantMagiclinkForms.applicantId],
			references: [applicants.id],
		}),
		workflow: one(workflows, {
			fields: [applicantMagiclinkForms.workflowId],
			references: [workflows.id],
		}),
		submissions: many(applicantSubmissions),
	})
);

export const applicantSubmissionsRelations = relations(
	applicantSubmissions,
	({ one }) => ({
		applicant: one(applicants, {
			fields: [applicantSubmissions.applicantId],
			references: [applicants.id],
		}),
		workflow: one(workflows, {
			fields: [applicantSubmissions.workflowId],
			references: [workflows.id],
		}),
		applicantMagiclinkForm: one(applicantMagiclinkForms, {
			fields: [applicantSubmissions.applicantMagiclinkFormId],
			references: [applicantMagiclinkForms.id],
		}),
	})
);

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
	applicant: one(applicants, {
		fields: [riskAssessments.applicantId],
		references: [applicants.id],
	}),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
	workflow: one(workflows, {
		fields: [quotes.workflowId],
		references: [workflows.id],
	}),
}));

export const agentCallbacksRelations = relations(agentCallbacks, ({ one }) => ({
	workflow: one(workflows, {
		fields: [agentCallbacks.workflowId],
		references: [workflows.id],
	}),
}));

export const aiFeedbackLogsRelations = relations(aiFeedbackLogs, ({ one }) => ({
	workflow: one(workflows, {
		fields: [aiFeedbackLogs.workflowId],
		references: [workflows.id],
	}),
	applicant: one(applicants, {
		fields: [aiFeedbackLogs.applicantId],
		references: [applicants.id],
	}),
	relatedFailureEvent: one(workflowEvents, {
		fields: [aiFeedbackLogs.relatedFailureEventId],
		references: [workflowEvents.id],
	}),
}));

// ============================================
// Legacy table (kept for compatibility)
// ============================================

export const todos = pgTable("todos", {
	id: serial("id").primaryKey(),
	description: text("description").notNull(),
	completed: boolean("completed").notNull().default(false),
});

// ============================================
// Internal Forms Tables
// ============================================

/**
 * Form types enum for internal forms
 */
export const FORM_TYPES = [
	"stratcol_agreement",
	"facility_application",
	"absa_6995",
	"fica_documents",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

/**
 * Internal Forms - Track form submission status per workflow
 */
export const internalForms = pgTable("internal_forms", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	formType: text("form_type", {
		enum: ["stratcol_agreement", "facility_application", "absa_6995", "fica_documents"],
	}).notNull(),
	status: text("status", {
		enum: [
			"not_started",
			"in_progress",
			"submitted",
			"approved",
			"rejected",
			"revision_required",
		],
	})
		.notNull()
		.default("not_started"),
	currentStep: integer("current_step").notNull().default(1),
	totalSteps: integer("total_steps").notNull().default(1),
	lastSavedAt: timestamp("last_saved_at"),
	submittedAt: timestamp("submitted_at"),
	reviewedAt: timestamp("reviewed_at"),
	reviewedBy: text("reviewed_by"), // Clerk user ID
	reviewNotes: text("review_notes"),
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Internal Submissions - Store form data with versioning
 */
export const internalSubmissions = pgTable("internal_submissions", {
	id: serial("id").primaryKey(),
	internalFormId: integer("internal_form_id")
		.notNull()
		.references(() => internalForms.id),
	version: integer("version").notNull().default(1),
	formData: text("form_data").notNull(), // JSON string of form values
	isDraft: boolean("is_draft").notNull().default(true),
	submittedBy: text("submitted_by"), // Clerk user ID
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Document Uploads - FICA document metadata and verification status
 */
export const documentUploads = pgTable("document_uploads", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	internalFormId: integer("internal_form_id").references(() => internalForms.id),
	category: text("category", {
		enum: ["standard", "individual", "financial", "professional", "industry"],
	}).notNull(),
	documentType: text("document_type").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(),
	fileContent: text("file_content"),
	mimeType: text("mime_type").notNull(),
	storageKey: text("storage_key").notNull(),
	storageUrl: text("storage_url"),
	verificationStatus: text("verification_status", {
		enum: ["pending", "verified", "rejected", "expired"],
	})
		.notNull()
		.default("pending"),
	verificationNotes: text("verification_notes"),
	verifiedBy: text("verified_by"),
	verifiedAt: timestamp("verified_at"),
	expiresAt: timestamp("expires_at"),
	metadata: text("metadata"),
	uploadedBy: text("uploaded_by"),
	uploadedAt: timestamp("uploaded_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Signatures - Canvas signature data with timestamps
 */
export const signatures = pgTable("signatures", {
	id: serial("id").primaryKey(),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	internalFormId: integer("internal_form_id")
		.notNull()
		.references(() => internalForms.id),
	signatoryName: text("signatory_name").notNull(),
	signatoryRole: text("signatory_role"), // e.g., "Director", "Authorised Representative"
	signatoryIdNumber: text("signatory_id_number"),
	signatureData: text("signature_data").notNull(), // Base64 PNG data URL
	signatureHash: text("signature_hash").notNull(), // SHA-256 hash for integrity
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	signedAt: timestamp("signed_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Internal Forms Relations
// ============================================

export const internalFormsRelations = relations(internalForms, ({ one, many }) => ({
	workflow: one(workflows, {
		fields: [internalForms.workflowId],
		references: [workflows.id],
	}),
	submissions: many(internalSubmissions),
	documents: many(documentUploads),
	signatures: many(signatures),
}));

export const internalSubmissionsRelations = relations(internalSubmissions, ({ one }) => ({
	internalForm: one(internalForms, {
		fields: [internalSubmissions.internalFormId],
		references: [internalForms.id],
	}),
}));

export const documentUploadsRelations = relations(documentUploads, ({ one }) => ({
	workflow: one(workflows, {
		fields: [documentUploads.workflowId],
		references: [workflows.id],
	}),
	internalForm: one(internalForms, {
		fields: [documentUploads.internalFormId],
		references: [internalForms.id],
	}),
}));

export const signaturesRelations = relations(signatures, ({ one }) => ({
	workflow: one(workflows, {
		fields: [signatures.workflowId],
		references: [workflows.id],
	}),
	internalForm: one(internalForms, {
		fields: [signatures.internalFormId],
		references: [internalForms.id],
	}),
}));

// ============================================
// SOP v3.1.0: New Tables
// ============================================

/**
 * Sanction Clearance Table - Track manual clearance of sanction hits
 */
export const sanctionClearance = pgTable("sanction_clearance", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	sanctionListId: text("sanction_list_id"), // External ID (e.g. OFAC-123)
	clearedBy: text("cleared_by").notNull(), // User ID
	clearanceReason: text("clearance_reason").notNull(), // Mandatory justification
	isFalsePositive: boolean("is_false_positive").notNull(),
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * AI Analysis Logs - Detailed AI outputs
 */
export const aiAnalysisLogs = pgTable("ai_analysis_logs", {
	id: serial("id").primaryKey(),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	agentName: text("agent_name").notNull(), // 'risk', 'sanctions', 'reporter'
	promptVersionId: text("prompt_version_id"), // Git hash or SemVer
	confidenceScore: integer("confidence_score"), // 0-100
	humanOverrideReason: text("human_override_reason", {
		enum: [
			"AI_ALIGNED",
			"MISSING_CONTEXT",
			"INCORRECT_RISK_SCORING",
			"FALSE_POSITIVE_FLAG",
			"FALSE_NEGATIVE_MISS",
			"POLICY_EXCEPTION",
			"DATA_QUALITY_ISSUE",
			"OTHER",
			"CONTEXT",
			"HALLUCINATION",
			"DATA_ERROR",
		],
	}),
	narrative: text("narrative"), // The structured output or summary
	rawOutput: text("raw_output"), // Full JSON output
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
});
