import { relations } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

// ============================================
// Core Onboarding Tables
// ============================================

/**
 * Leads/Applications table - Central entity
 * Renamed specific fields to match user preference: mandateVolume, itcScore, etc.
 */
export const leads = sqliteTable('leads', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    // Basic Info
    companyName: text('company_name').notNull(),
    tradingName: text('trading_name'),
    registrationNumber: text('registration_number'),
    contactName: text('contact_name').notNull(),
    email: text('email').notNull(), // contact_email
    phone: text('phone'), // contact_phone
    industry: text('industry'),

    // Mandate Info
    mandateType: text('mandate_type'), // debit_order, eft_collection, etc.
    mandateVolume: integer('mandate_volume'), // Renamed from estimatedVolume (was text), now integer cents or rand value? User used integer.

    // Status & Risk
    status: text('status').notNull().default('new'), // aka 'stage' in user schema
    riskLevel: text('risk_level'), // green, amber, red
    itcScore: integer('itc_score'),
    itcStatus: text('itc_status'),

    // Employee Info (Our legacy field, keeping for now)
    employeeCount: integer('employee_count'),

    // System
    accountExecutive: text('account_executive'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

/**
 * Documents table - Dedicated document tracking
 */
export const documents = sqliteTable('documents', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    leadId: integer('lead_id')
        .notNull()
        .references(() => leads.id), // Link to Lead/Application
    type: text('type').notNull(), // bank_statement, id_document, etc.
    status: text('status').notNull().default('pending'), // pending, uploaded, verified, rejected
    fileName: text('file_name'),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp' }),
    verifiedAt: integer('verified_at', { mode: 'timestamp' }),
    notes: text('notes'),
});

/**
 * Risk Assessments table - Application risk Profiles
 */
export const riskAssessments = sqliteTable('risk_assessments', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    leadId: integer('lead_id')
        .notNull()
        .references(() => leads.id),
    overallRisk: text('overall_risk'), // green, amber, red

    // Specific risk factors from user schema
    cashFlowConsistency: text('cash_flow_consistency'),
    dishonouredPayments: integer('dishonoured_payments'),
    averageDailyBalance: integer('average_daily_balance'),
    accountMatchVerified: text('account_match_verified'), // yes/no or status
    letterheadVerified: text('letterhead_verified'),

    aiAnalysis: text('ai_analysis'), // JSON string, equivalent to jsonb
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

/**
 * Activity Logs - General audits
 */
export const activityLogs = sqliteTable('activity_logs', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    leadId: integer('lead_id')
        .notNull()
        .references(() => leads.id),
    action: text('action').notNull(),
    description: text('description').notNull(),
    performedBy: text('performed_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

// ============================================
// Workflow Engine Tables (Keeping these for Inngest compatibility)
// ============================================

export const workflows = sqliteTable('workflows', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    leadId: integer('lead_id')
        .notNull()
        .references(() => leads.id),
    stage: integer('stage', { mode: 'number' }).default(1),
    status: text('status').default('pending'),
    startedAt: integer('started_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    metadata: text('metadata'),
});

export const notifications = sqliteTable('notifications', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    workflowId: integer('workflow_id').references(() => workflows.id),
    leadId: integer('lead_id').references(() => leads.id),
    type: text('type').notNull(),
    message: text('message').notNull(),
    read: integer('read', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    actionable: integer('actionable', { mode: 'boolean' }).default(false),
});

export const workflowEvents = sqliteTable('workflow_events', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    workflowId: integer('workflow_id').references(() => workflows.id),
    eventType: text('event_type').notNull(),
    payload: text('payload'),
    timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    actorType: text('actor_type').default('platform'),
    actorId: text('actor_id'),
});

// ============================================
// Relations
// ============================================

export const leadsRelations = relations(leads, ({ many, one }) => ({
    workflows: many(workflows),
    documents: many(documents),
    riskAssessment: one(riskAssessments, {
        fields: [leads.id],
        references: [riskAssessments.leadId], // One-to-one roughly
    }),
    activityLogs: many(activityLogs),
}));

/**
 * Agent Registry - Track available external agents
 */
export const agents = sqliteTable('agents', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    agentId: text('agent_id').notNull().unique(), // e.g., "xt_risk_agent_v2"
    name: text('name').notNull(),
    description: text('description'),
    webhookUrl: text('webhook_url'),
    taskType: text('task_type', {
        enum: ['document_generation', 'electronic_signature', 'risk_verification', 'data_sync', 'notification'],
    }).notNull(),
    status: text('status', { enum: ['active', 'inactive', 'error'] })
        .notNull()
        .default('active'),
    lastCallbackAt: integer('last_callback_at', { mode: 'timestamp' }),
    callbackCount: integer('callback_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

/**
 * external Callbacks - Agent callback records
 */
export const agentCallbacks = sqliteTable('xt_callbacks', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    workflowId: integer('workflow_id')
        .notNull()
        .references(() => workflows.id),
    eventId: text('event_id').notNull(), // From incoming webhook
    agentId: text('agent_id').notNull(), // e.g., "xt_risk_agent_v2"
    status: text('status', {
        enum: ['received', 'validated', 'processed', 'rejected', 'error'],
    })
        .notNull()
        .default('received'),
    decision: text('decision', {
        enum: ['approved', 'rejected', 'pending_info'],
    }),
    outcome: text('outcome'), // Full decision JSON
    rawPayload: text('raw_payload').notNull(), // Complete incoming JSON
    validationErrors: text('validation_errors'), // Any Zod errors
    humanActor: text('human_actor'), // Email of human who made decision
    processedAt: integer('processed_at', { mode: 'timestamp' }),
    receivedAt: integer('received_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

/**
 * Quotes table - Generated fee structures
 */
export const quotes = sqliteTable('quotes', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    workflowId: integer('workflow_id')
        .notNull()
        .references(() => workflows.id),
    amount: integer('amount').notNull(), // Cents
    baseFeePercent: integer('base_fee_percent').notNull(), // Basis points (e.g. 150 = 1.5%)
    adjustedFeePercent: integer('adjusted_fee_percent'), // Basis points
    rationale: text('rationale'), // AI reasoning for the fee
    status: text('status', {
        enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    })
        .notNull()
        .default('draft'),
    generatedBy: text('generated_by').notNull().default('platform'), // 'system' or 'gemini'
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const documentsRelations = relations(documents, ({ one }) => ({
    lead: one(leads, {
        fields: [documents.leadId],
        references: [leads.id],
    }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
	lead: one(leads, {
		fields: [workflows.leadId],
		references: [leads.id],
	}),
	quotes: many(quotes),
	events: many(workflowEvents),
	callbacks: many(agentCallbacks),
	onboardingForms: many(onboardingForms),
	documentUploads: many(documentUploads),
	signatures: many(signatures),
>>>>>>> eafdf64 (feat: add onboarding forms and user guides)
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
<<<<<<< HEAD
=======

// ============================================
// Legacy table (kept for compatibility)
// ============================================

export const todos = sqliteTable("todos", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	description: text("description").notNull(),
	completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

/**
 * Notifications table - Control Tower UI alerts
 */
export const notifications = sqliteTable("notifications", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id").references(() => workflows.id),
	leadId: integer("lead_id").references(() => leads.id),
	type: text("type", {
		enum: ["awaiting", "completed", "failed", "timeout", "paused", "error"],
	}).notNull(),
	title: text("title").notNull(),
	message: text("message").notNull(),
	actionable: integer("actionable", { mode: "boolean" }).default(true),
	read: integer("read", { mode: "boolean" }).notNull().default(false),
	errorDetails: text("error_details"), // JSON with error context
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Onboarding Forms Tables
// ============================================

/**
 * Form types enum for onboarding forms
 */
export const FORM_TYPES = [
	"stratcol_agreement",
	"facility_application",
	"absa_6995",
	"fica_documents",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

/**
 * Onboarding Forms - Track form submission status per workflow
 */
export const onboardingForms = sqliteTable("onboarding_forms", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	formType: text("form_type", {
		enum: ["stratcol_agreement", "facility_application", "absa_6995", "fica_documents"],
	}).notNull(),
	status: text("status", {
		enum: ["not_started", "in_progress", "submitted", "approved", "rejected", "revision_required"],
	})
		.notNull()
		.default("not_started"),
	currentStep: integer("current_step").notNull().default(1),
	totalSteps: integer("total_steps").notNull().default(1),
	lastSavedAt: integer("last_saved_at", { mode: "timestamp" }),
	submittedAt: integer("submitted_at", { mode: "timestamp" }),
	reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
	reviewedBy: text("reviewed_by"), // Clerk user ID
	reviewNotes: text("review_notes"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Form Submissions - Store form data with versioning
 */
export const formSubmissions = sqliteTable("form_submissions", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	onboardingFormId: integer("onboarding_form_id")
		.notNull()
		.references(() => onboardingForms.id),
	version: integer("version").notNull().default(1),
	formData: text("form_data").notNull(), // JSON string of form values
	isDraft: integer("is_draft", { mode: "boolean" }).notNull().default(true),
	submittedBy: text("submitted_by"), // Clerk user ID
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Document Uploads - FICA document metadata and verification status
 */
export const documentUploads = sqliteTable("document_uploads", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	onboardingFormId: integer("onboarding_form_id").references(() => onboardingForms.id),
	category: text("category", {
		enum: ["standard", "individual", "financial", "professional", "industry"],
	}).notNull(),
	documentType: text("document_type").notNull(), // e.g., "cipc_registration", "director_id", "bank_statement"
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(), // bytes
	mimeType: text("mime_type").notNull(),
	storageKey: text("storage_key").notNull(), // S3/R2 key or local path
	storageUrl: text("storage_url"), // Public or signed URL
	verificationStatus: text("verification_status", {
		enum: ["pending", "verified", "rejected", "expired"],
	})
		.notNull()
		.default("pending"),
	verificationNotes: text("verification_notes"),
	verifiedBy: text("verified_by"), // Clerk user ID or "system"
	verifiedAt: integer("verified_at", { mode: "timestamp" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }), // For documents with expiry
	metadata: text("metadata"), // JSON for additional document-specific data
	uploadedBy: text("uploaded_by"), // Clerk user ID
	uploadedAt: integer("uploaded_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Signatures - Canvas signature data with timestamps
 */
export const signatures = sqliteTable("signatures", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	onboardingFormId: integer("onboarding_form_id")
		.notNull()
		.references(() => onboardingForms.id),
	signatoryName: text("signatory_name").notNull(),
	signatoryRole: text("signatory_role"), // e.g., "Director", "Authorised Representative"
	signatoryIdNumber: text("signatory_id_number"),
	signatureData: text("signature_data").notNull(), // Base64 PNG data URL
	signatureHash: text("signature_hash").notNull(), // SHA-256 hash for integrity
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	signedAt: integer("signed_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Onboarding Forms Relations
// ============================================

export const onboardingFormsRelations = relations(onboardingForms, ({ one, many }) => ({
	workflow: one(workflows, {
		fields: [onboardingForms.workflowId],
		references: [workflows.id],
	}),
	submissions: many(formSubmissions),
	documents: many(documentUploads),
	signatures: many(signatures),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
	onboardingForm: one(onboardingForms, {
		fields: [formSubmissions.onboardingFormId],
		references: [onboardingForms.id],
	}),
}));

export const documentUploadsRelations = relations(documentUploads, ({ one }) => ({
	workflow: one(workflows, {
		fields: [documentUploads.workflowId],
		references: [workflows.id],
	}),
	onboardingForm: one(onboardingForms, {
		fields: [documentUploads.onboardingFormId],
		references: [onboardingForms.id],
	}),
}));

export const signaturesRelations = relations(signatures, ({ one }) => ({
	workflow: one(workflows, {
		fields: [signatures.workflowId],
		references: [workflows.id],
	}),
	onboardingForm: one(onboardingForms, {
		fields: [signatures.onboardingFormId],
		references: [onboardingForms.id],
	}),
}));
>>>>>>> eafdf64 (feat: add onboarding forms and user guides)
