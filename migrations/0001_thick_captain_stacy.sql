CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`webhook_url` text,
	`task_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_callback_at` integer,
	`callback_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`industry` text,
	`employee_count` integer,
	`estimated_volume` text,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`from_stage` integer,
	`to_stage` integer,
	`payload` text,
	`actor_id` text,
	`actor_type` text DEFAULT 'system' NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`stage` integer DEFAULT 1 NOT NULL,
	`stage_name` text DEFAULT 'lead_capture' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_agent` text,
	`agent_sent_at` integer,
	`metadata` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `xt_callbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`event_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`decision` text,
	`outcome` text,
	`raw_payload` text NOT NULL,
	`validation_errors` text,
	`human_actor` text,
	`processed_at` integer,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
