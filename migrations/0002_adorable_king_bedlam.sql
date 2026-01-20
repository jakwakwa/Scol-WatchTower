CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`base_fee_percent` integer NOT NULL,
	`adjusted_fee_percent` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`generated_by` text DEFAULT 'system' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
