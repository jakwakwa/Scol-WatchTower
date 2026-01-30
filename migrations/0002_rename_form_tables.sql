ALTER TABLE `form_instances` RENAME TO `applicant_magiclink_forms`;
--> statement-breakpoint
ALTER TABLE `form_submissions` RENAME TO `applicant_submissions`;
--> statement-breakpoint
ALTER TABLE `onboarding_forms` RENAME TO `internal_forms`;
--> statement-breakpoint
ALTER TABLE `onboarding_form_submissions` RENAME TO `internal_submissions`;
