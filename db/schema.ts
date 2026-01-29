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
    category: text('category'), // standard_application, fica_entity, etc.
    source: text('source'), // client, agent, internal, system
    fileName: text('file_name'),
    storageUrl: text('storage_url'),
    uploadedBy: text('uploaded_by'),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp' }),
    verifiedAt: integer('verified_at', { mode: 'timestamp' }),
    processedAt: integer('processed_at', { mode: 'timestamp' }),
    processingStatus: text('processing_status'), // pending, processed, failed
    processingResult: text('processing_result'), // JSON string
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

/**
 * Form Instances - Magic link tracking
 */
export const formInstances = sqliteTable('form_instances', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    leadId: integer('lead_id')
        .notNull()
        .references(() => leads.id),
    workflowId: integer('workflow_id').references(() => workflows.id),
    formType: text('form_type').notNull(), // FACILITY_APPLICATION, SIGNED_QUOTATION, etc.
    status: text('status').notNull().default('pending'), // pending, sent, viewed, submitted, expired, revoked
    tokenHash: text('token_hash').notNull().unique(),
    tokenPrefix: text('token_prefix'),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    viewedAt: integer('viewed_at', { mode: 'timestamp' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

/**
 * Form Submissions - Stored form payloads
 */
export const formSubmissions = sqliteTable('form_submissions', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    formInstanceId: integer('form_instance_id')
        .notNull()
        .references(() => formInstances.id),
    leadId: integer('lead_id')
        .notNull()
        .references(() => leads.id),
    workflowId: integer('workflow_id').references(() => workflows.id),
    formType: text('form_type').notNull(),
    data: text('data').notNull(), // JSON string
    submittedBy: text('submitted_by'),
    version: integer('version').default(1),
    submittedAt: integer('submitted_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

// ============================================
// Relations
// ============================================

export const leadsRelations = relations(leads, ({ many, one }) => ({
    workflows: many(workflows),
    documents: many(documents),
    formInstances: many(formInstances),
    formSubmissions: many(formSubmissions),
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

export const formInstancesRelations = relations(formInstances, ({ one, many }) => ({
    lead: one(leads, {
        fields: [formInstances.leadId],
        references: [leads.id],
    }),
    workflow: one(workflows, {
        fields: [formInstances.workflowId],
        references: [workflows.id],
    }),
    submissions: many(formSubmissions),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
    lead: one(leads, {
        fields: [formSubmissions.leadId],
        references: [leads.id],
    }),
    workflow: one(workflows, {
        fields: [formSubmissions.workflowId],
        references: [workflows.id],
    }),
    formInstance: one(formInstances, {
        fields: [formSubmissions.formInstanceId],
        references: [formInstances.id],
    }),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
    lead: one(leads, {
        fields: [riskAssessments.leadId],
        references: [leads.id],
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
