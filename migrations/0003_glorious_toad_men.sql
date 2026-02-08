DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-04T12:12:46.806Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-04T12:12:46.806Z"';--> statement-breakpoint
ALTER TABLE `applicants` ADD `business_type` text;--> statement-breakpoint
ALTER TABLE `applicants` ADD `entity_type` text;--> statement-breakpoint
ALTER TABLE `applicants` ADD `product_type` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `completed_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `terminated_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `terminated_by` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `termination_reason` text;