CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`action` text NOT NULL,
	`description` text NOT NULL,
	`performed_by` text,
	`created_at` integer DEFAULT '"2026-01-30T14:00:06.703Z"',
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `xt_callbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`event_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`decision` text,
	`outcome` text,
	`raw_payload` text NOT NULL,
	`validation_errors` text,
	`human_actor` text,
	`processed_at` integer,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`webhook_url` text,
	`task_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_callback_at` integer,
	`callback_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE TABLE `applicant_magiclink_forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer,
	`form_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text,
	`sent_at` integer,
	`viewed_at` integer,
	`expires_at` integer,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
CREATE TABLE `applicant_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_magiclink_form_id` integer NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer,
	`form_type` text NOT NULL,
	`data` text NOT NULL,
	`submitted_by` text,
	`version` integer DEFAULT 1,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`applicant_magiclink_form_id`) REFERENCES `applicant_magiclink_forms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `applicants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`trading_name` text,
	`registration_number` text,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`industry` text,
	`mandate_type` text,
	`mandate_volume` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`risk_level` text,
	`itc_score` integer,
	`itc_status` text,
	`employee_count` integer,
	`account_executive` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`internal_form_id` integer,
	`category` text NOT NULL,
	`document_type` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`storage_url` text,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verification_notes` text,
	`verified_by` text,
	`verified_at` integer,
	`expires_at` integer,
	`metadata` text,
	`uploaded_by` text,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`internal_form_id`) REFERENCES `internal_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`category` text,
	`source` text,
	`file_name` text,
	`storage_url` text,
	`uploaded_by` text,
	`uploaded_at` integer,
	`verified_at` integer,
	`processed_at` integer,
	`processing_status` text,
	`processing_result` text,
	`notes` text,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `internal_forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`form_type` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`total_steps` integer DEFAULT 1 NOT NULL,
	`last_saved_at` integer,
	`submitted_at` integer,
	`reviewed_at` integer,
	`reviewed_by` text,
	`review_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `internal_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`internal_form_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`form_data` text NOT NULL,
	`is_draft` integer DEFAULT true NOT NULL,
	`submitted_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`internal_form_id`) REFERENCES `internal_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer,
	`applicant_id` integer,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false,
	`created_at` integer,
	`actionable` integer DEFAULT false,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer,
	`workflow_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`base_fee_percent` integer NOT NULL,
	`adjusted_fee_percent` integer,
	`details` text,
	`rationale` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`generated_by` text DEFAULT 'platform' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`overall_risk` text,
	`cash_flow_consistency` text,
	`dishonoured_payments` integer,
	`average_daily_balance` integer,
	`account_match_verified` text,
	`letterhead_verified` text,
	`ai_analysis` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`notes` text,
	`created_at` integer DEFAULT '"2026-01-30T14:00:06.703Z"',
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`internal_form_id` integer NOT NULL,
	`signatory_name` text NOT NULL,
	`signatory_role` text,
	`signatory_id_number` text,
	`signature_data` text NOT NULL,
	`signature_hash` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`signed_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`internal_form_id`) REFERENCES `internal_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`description` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer,
	`event_type` text NOT NULL,
	`payload` text,
	`timestamp` integer,
	`actor_type` text DEFAULT 'platform',
	`actor_id` text,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`stage` integer DEFAULT 1,
	`status` text DEFAULT 'pending',
	`started_at` integer,
	`metadata` text,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
