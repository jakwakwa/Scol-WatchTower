ALTER TABLE `leads` RENAME TO `applicants`;

ALTER TABLE `documents` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `risk_assessments` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `activity_logs` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `workflows` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `notifications` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `applicant_magiclink_forms` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `applicant_submissions` RENAME COLUMN `lead_id` TO `applicant_id`;
ALTER TABLE `quotes` RENAME COLUMN `lead_id` TO `applicant_id`;
