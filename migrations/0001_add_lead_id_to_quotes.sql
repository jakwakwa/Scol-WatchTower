ALTER TABLE `quotes` ADD COLUMN `lead_id` integer REFERENCES `leads`(`id`);
--> statement-breakpoint
ALTER TABLE `quotes` ADD COLUMN `details` text;
