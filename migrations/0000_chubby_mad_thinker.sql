CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"performed_by" text,
	"created_at" timestamp DEFAULT '2026-03-14 06:42:43.887'
);
--> statement-breakpoint
CREATE TABLE "xt_callbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"event_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"decision" text,
	"outcome" text,
	"raw_payload" text NOT NULL,
	"validation_errors" text,
	"human_actor" text,
	"processed_at" timestamp,
	"received_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"webhook_url" text,
	"task_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_callback_at" timestamp,
	"callback_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "agents_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "ai_analysis_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"workflow_id" integer NOT NULL,
	"agent_name" text NOT NULL,
	"prompt_version_id" text,
	"confidence_score" integer,
	"human_override_reason" text,
	"narrative" text,
	"raw_output" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_feedback_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"ai_outcome" text NOT NULL,
	"ai_confidence" integer,
	"ai_check_type" text NOT NULL,
	"human_outcome" text NOT NULL,
	"override_category" text NOT NULL,
	"override_subcategory" text,
	"override_details" text,
	"is_divergent" boolean NOT NULL,
	"divergence_weight" integer,
	"divergence_type" text,
	"decided_by" text NOT NULL,
	"decided_at" timestamp NOT NULL,
	"related_failure_event_id" integer,
	"consumed_for_retraining" boolean DEFAULT false,
	"consumed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "applicant_magiclink_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"workflow_id" integer,
	"form_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"token_hash" text NOT NULL,
	"token" text,
	"token_prefix" text,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"expires_at" timestamp,
	"submitted_at" timestamp,
	"decision_status" text,
	"decision_outcome" text,
	"decision_reason" text,
	"decision_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "applicant_magiclink_forms_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "applicant_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_magiclink_form_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"workflow_id" integer,
	"form_type" text NOT NULL,
	"data" text NOT NULL,
	"submitted_by" text,
	"version" integer DEFAULT 1,
	"submitted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"trading_name" text,
	"registration_number" text,
	"contact_name" text NOT NULL,
	"id_number" text,
	"email" text NOT NULL,
	"phone" text,
	"business_type" text,
	"entity_type" text,
	"product_type" text,
	"industry" text,
	"employee_count" integer,
	"mandate_type" text,
	"mandate_volume" integer,
	"estimated_transactions_per_month" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"risk_level" text,
	"itc_score" integer,
	"itc_status" text,
	"escalation_tier" integer DEFAULT 1,
	"salvage_deadline" timestamp,
	"is_salvaged" boolean DEFAULT false,
	"sanction_status" text DEFAULT 'clear',
	"account_executive" text,
	"notes" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"internal_form_id" integer,
	"category" text NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_content" text,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"verified_by" text,
	"verified_at" timestamp,
	"expires_at" timestamp,
	"metadata" text,
	"uploaded_by" text,
	"uploaded_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"category" text,
	"source" text,
	"file_name" text,
	"file_content" text,
	"mime_type" text,
	"storage_url" text,
	"uploaded_by" text,
	"uploaded_at" timestamp,
	"verified_at" timestamp,
	"processed_at" timestamp,
	"processing_status" text,
	"processing_result" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "internal_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"form_type" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"total_steps" integer DEFAULT 1 NOT NULL,
	"last_saved_at" timestamp,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"review_notes" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"internal_form_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"form_data" text NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"submitted_by" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer,
	"applicant_id" integer,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false,
	"created_at" timestamp,
	"actionable" boolean DEFAULT false,
	"severity" text DEFAULT 'medium',
	"group_key" text
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer,
	"workflow_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"base_fee_percent" integer NOT NULL,
	"adjusted_fee_percent" integer,
	"details" text,
	"rationale" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_by" text DEFAULT 'platform' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "re_applicant_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"workflow_id" integer NOT NULL,
	"matched_deny_list_id" integer NOT NULL,
	"matched_on" text NOT NULL,
	"matched_value" text NOT NULL,
	"denied_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"overall_score" integer,
	"overall_status" text,
	"overall_risk" text,
	"procurement_data" text,
	"itc_data" text,
	"sanctions_data" text,
	"fica_data" text,
	"cash_flow_consistency" text,
	"dishonoured_payments" integer,
	"average_daily_balance" integer,
	"account_match_verified" text,
	"letterhead_verified" text,
	"ai_analysis" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT '2026-03-14 06:42:43.887'
);
--> statement-breakpoint
CREATE TABLE "risk_check_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"check_type" text NOT NULL,
	"machine_state" text DEFAULT 'pending' NOT NULL,
	"review_state" text DEFAULT 'pending' NOT NULL,
	"provider" text,
	"external_check_id" text,
	"payload" text,
	"raw_payload" text,
	"error_details" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sanction_clearance" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"workflow_id" integer NOT NULL,
	"sanction_list_id" text,
	"cleared_by" text NOT NULL,
	"clearance_reason" text NOT NULL,
	"is_false_positive" boolean NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"internal_form_id" integer NOT NULL,
	"signatory_name" text NOT NULL,
	"signatory_role" text,
	"signatory_id_number" text,
	"signature_data" text NOT NULL,
	"signature_hash" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"signed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer,
	"event_type" text NOT NULL,
	"payload" text,
	"timestamp" timestamp,
	"actor_type" text DEFAULT 'platform',
	"actor_id" text
);
--> statement-breakpoint
CREATE TABLE "workflow_termination_deny_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"id_numbers" text NOT NULL,
	"board_member_ids" text NOT NULL,
	"cellphones" text NOT NULL,
	"bank_accounts" text NOT NULL,
	"board_member_names" text NOT NULL,
	"termination_reason" text NOT NULL,
	"terminated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_termination_screening" (
	"id" serial PRIMARY KEY NOT NULL,
	"deny_list_id" integer NOT NULL,
	"value_type" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"stage" integer DEFAULT 1,
	"status" text DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"terminated_at" timestamp,
	"terminated_by" text,
	"termination_reason" text,
	"procurement_cleared" boolean,
	"documents_complete" boolean,
	"ai_analysis_complete" boolean,
	"mandate_retry_count" integer DEFAULT 0,
	"mandate_last_sent_at" timestamp,
	"risk_manager_approval" text,
	"account_manager_approval" text,
	"contract_draft_reviewed_at" integer,
	"contract_draft_reviewed_by" text,
	"absa_packet_sent_at" timestamp,
	"absa_packet_sent_by" text,
	"absa_approval_confirmed_at" integer,
	"absa_approval_confirmed_by" text,
	"sales_evaluation_status" text,
	"sales_issues_summary" text,
	"issue_flagged_by" text,
	"pre_risk_required" boolean,
	"pre_risk_outcome" text,
	"pre_risk_evaluated_at" timestamp,
	"applicant_decision_outcome" text,
	"applicant_decline_reason" text,
	"stage_name" text,
	"current_agent" text,
	"review_type" text,
	"decision_type" text,
	"target_resource" text,
	"state_lock_version" integer DEFAULT 0,
	"state_locked_at" timestamp,
	"state_locked_by" text,
	"green_lane_requested_at" timestamp,
	"green_lane_requested_by" text,
	"green_lane_request_notes" text,
	"green_lane_request_source" text,
	"green_lane_consumed_at" timestamp,
	"metadata" text
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xt_callbacks" ADD CONSTRAINT "xt_callbacks_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "ai_analysis_logs_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analysis_logs" ADD CONSTRAINT "ai_analysis_logs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback_logs" ADD CONSTRAINT "ai_feedback_logs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback_logs" ADD CONSTRAINT "ai_feedback_logs_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback_logs" ADD CONSTRAINT "ai_feedback_logs_related_failure_event_id_workflow_events_id_fk" FOREIGN KEY ("related_failure_event_id") REFERENCES "public"."workflow_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_magiclink_forms" ADD CONSTRAINT "applicant_magiclink_forms_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_magiclink_forms" ADD CONSTRAINT "applicant_magiclink_forms_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_submissions" ADD CONSTRAINT "applicant_submissions_applicant_magiclink_form_id_applicant_magiclink_forms_id_fk" FOREIGN KEY ("applicant_magiclink_form_id") REFERENCES "public"."applicant_magiclink_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_submissions" ADD CONSTRAINT "applicant_submissions_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_submissions" ADD CONSTRAINT "applicant_submissions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_internal_form_id_internal_forms_id_fk" FOREIGN KEY ("internal_form_id") REFERENCES "public"."internal_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_forms" ADD CONSTRAINT "internal_forms_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_submissions" ADD CONSTRAINT "internal_submissions_internal_form_id_internal_forms_id_fk" FOREIGN KEY ("internal_form_id") REFERENCES "public"."internal_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "re_applicant_attempts" ADD CONSTRAINT "re_applicant_attempts_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "re_applicant_attempts" ADD CONSTRAINT "re_applicant_attempts_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "re_applicant_attempts" ADD CONSTRAINT "re_applicant_attempts_matched_deny_list_id_workflow_termination_deny_list_id_fk" FOREIGN KEY ("matched_deny_list_id") REFERENCES "public"."workflow_termination_deny_list"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_check_results" ADD CONSTRAINT "risk_check_results_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_check_results" ADD CONSTRAINT "risk_check_results_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanction_clearance" ADD CONSTRAINT "sanction_clearance_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanction_clearance" ADD CONSTRAINT "sanction_clearance_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_internal_form_id_internal_forms_id_fk" FOREIGN KEY ("internal_form_id") REFERENCES "public"."internal_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_termination_deny_list" ADD CONSTRAINT "workflow_termination_deny_list_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_termination_deny_list" ADD CONSTRAINT "workflow_termination_deny_list_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_termination_screening" ADD CONSTRAINT "workflow_termination_screening_deny_list_id_workflow_termination_deny_list_id_fk" FOREIGN KEY ("deny_list_id") REFERENCES "public"."workflow_termination_deny_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_termination_screening_value_type_value_idx" ON "workflow_termination_screening" USING btree ("value_type","value");--> statement-breakpoint
CREATE INDEX "workflow_termination_screening_deny_list_id_idx" ON "workflow_termination_screening" USING btree ("deny_list_id");