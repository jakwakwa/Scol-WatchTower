DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-10T16:28:31.980Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-10T16:28:31.980Z"';--> statement-breakpoint
ALTER TABLE `risk_assessments` ADD `overall_score` integer;--> statement-breakpoint
ALTER TABLE `risk_assessments` ADD `overall_status` text;--> statement-breakpoint
ALTER TABLE `risk_assessments` ADD `procurement_data` text;--> statement-breakpoint
ALTER TABLE `risk_assessments` ADD `itc_data` text;--> statement-breakpoint
ALTER TABLE `risk_assessments` ADD `sanctions_data` text;--> statement-breakpoint
ALTER TABLE `risk_assessments` ADD `fica_data` text;