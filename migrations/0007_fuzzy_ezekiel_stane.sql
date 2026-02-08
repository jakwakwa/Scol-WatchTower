DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-08T19:56:51.868Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-08T19:56:51.868Z"';--> statement-breakpoint
ALTER TABLE `workflows` ADD `mandate_retry_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflows` ADD `mandate_last_sent_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `risk_manager_approval` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `account_manager_approval` text;