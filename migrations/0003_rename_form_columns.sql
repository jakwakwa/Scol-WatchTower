ALTER TABLE `applicant_submissions` RENAME COLUMN `form_instance_id` TO `applicant_magiclink_form_id`;
--> statement-breakpoint
ALTER TABLE `internal_submissions` RENAME COLUMN `onboarding_form_id` TO `internal_form_id`;
--> statement-breakpoint
ALTER TABLE `document_uploads` RENAME COLUMN `onboarding_form_id` TO `internal_form_id`;
--> statement-breakpoint
ALTER TABLE `signatures` RENAME COLUMN `onboarding_form_id` TO `internal_form_id`;
