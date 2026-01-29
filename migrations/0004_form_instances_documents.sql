CREATE TABLE `form_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`workflow_id` integer,
	`form_type` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`token_hash` text NOT NULL UNIQUE,
	`token_prefix` text,
	`sent_at` integer,
	`viewed_at` integer,
	`expires_at` integer,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`form_instance_id` integer NOT NULL,
	`lead_id` integer NOT NULL,
	`workflow_id` integer,
	`form_type` text NOT NULL,
	`data` text NOT NULL,
	`submitted_by` text,
	`version` integer DEFAULT 1,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`form_instance_id`) REFERENCES `form_instances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `documents` ADD `category` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `source` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `storage_url` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `uploaded_by` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `processed_at` integer;
--> statement-breakpoint
ALTER TABLE `documents` ADD `processing_status` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `processing_result` text;
