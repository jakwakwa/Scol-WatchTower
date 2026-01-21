import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================
// Core Onboarding Tables
// ============================================

/**
 * Leads table - Potential clients being onboarded
 */
export const leads = sqliteTable("leads", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	companyName: text("company_name").notNull(),
	contactName: text("contact_name").notNull(),
	email: text("email").notNull(),
	phone: text("phone"),
	industry: text("industry"),
	employeeCount: integer("employee_count"),
	estimatedVolume: text("estimated_volume"),
	status: text("status", {
		enum: [
			"new",
			"contacted",
			"qualified",
			"proposal",
			"negotiation",
			"won",
			"lost",
		],
	})
		.notNull()
		.default("new"),
	notes: text("notes"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Workflows table - Active onboarding workflow instances
 */
export const workflows = sqliteTable("workflows", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	leadId: integer("lead_id")
		.notNull()
		.references(() => leads.id),
	stage: integer("stage", { mode: "number" }).notNull().default(1), // 1-4 based on plan stages
	stageName: text("stage_name", {
		enum: ["lead_capture", "dynamic_quotation", "verification", "integration"],
	})
		.notNull()
		.default("lead_capture"),
	status: text("status", {
		enum: [
			"pending",
			"in_progress",
			"awaiting_human",
			"completed",
			"failed",
			"timeout",
		],
	})
		.notNull()
		.default("pending"),
	currentAgent: text("current_agent"), // e.g., "zapier_doc_agent_v1"
	agentSentAt: integer("agent_sent_at", { mode: "timestamp" }),
	metadata: text("metadata"), // JSON string for flexible data
	errorDetails: text("error_details"), // JSON string for error context
	startedAt: integer("started_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	completedAt: integer("completed_at", { mode: "timestamp" }),
});

/**
 * Workflow Events - Audit log of all workflow transitions
 */
export const workflowEvents = sqliteTable("workflow_events", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	eventType: text("event_type", {
		enum: [
			"stage_change",
			"agent_dispatch",
			"agent_callback",
			"human_override",
			"timeout",
			"error",
		],
	}).notNull(),
	fromStage: integer("from_stage"),
	toStage: integer("to_stage"),
	payload: text("payload"), // JSON string
	actorId: text("actor_id"), // Clerk user ID or agent ID
	actorType: text("actor_type", { enum: ["user", "agent", "system"] })
		.notNull()
		.default("system"),
	timestamp: integer("timestamp", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Zapier Callbacks - Agent callback records
 */
export const zapierCallbacks = sqliteTable("zapier_callbacks", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	eventId: text("event_id").notNull(), // From incoming webhook
	agentId: text("agent_id").notNull(), // e.g., "zapier_risk_agent_v2"
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
	processedAt: integer("processed_at", { mode: "timestamp" }),
	receivedAt: integer("received_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Agent Registry - Track available Zapier agents
 */
export const agents = sqliteTable("agents", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	agentId: text("agent_id").notNull().unique(), // e.g., "zapier_risk_agent_v2"
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
	lastCallbackAt: integer("last_callback_at", { mode: "timestamp" }),
	callbackCount: integer("callback_count").notNull().default(0),
	errorCount: integer("error_count").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Relations
// ============================================

/**
 * Quotes table - Generated fee structures
 */
export const quotes = sqliteTable("quotes", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	amount: integer("amount").notNull(), // Cents
	baseFeePercent: integer("base_fee_percent").notNull(), // Basis points (e.g. 150 = 1.5%)
	adjustedFeePercent: integer("adjusted_fee_percent"), // Basis points
	rationale: text("rationale"), // AI reasoning for the fee
	status: text("status", {
		enum: ["draft", "pending_approval", "approved", "rejected"],
	})
		.notNull()
		.default("draft"),
	generatedBy: text("generated_by").notNull().default("system"), // 'system' or 'gemini'
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Relations
// ============================================

export const leadsRelations = relations(leads, ({ many }) => ({
	workflows: many(workflows),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
	lead: one(leads, {
		fields: [workflows.leadId],
		references: [leads.id],
	}),
	quotes: many(quotes),
	events: many(workflowEvents),
	callbacks: many(zapierCallbacks),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
	workflow: one(workflows, {
		fields: [quotes.workflowId],
		references: [workflows.id],
	}),
}));

export const workflowEventsRelations = relations(workflowEvents, ({ one }) => ({
	workflow: one(workflows, {
		fields: [workflowEvents.workflowId],
		references: [workflows.id],
	}),
}));

export const zapierCallbacksRelations = relations(
	zapierCallbacks,
	({ one }) => ({
		workflow: one(workflows, {
			fields: [zapierCallbacks.workflowId],
			references: [workflows.id],
		}),
	}),
);

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

// Update workflows table to include error_details
// Note: This is an additive change to the existing schema definition
// We need to modify the existing workflows table definition in line 45-75
// but since I can't look back at the file content in this tool call,
// I will rely on the mulit_replace or just append the notifications table here
// and use a separate call to update the workflows table.
