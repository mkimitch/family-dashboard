CREATE TABLE `countdowns` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`target_date` text NOT NULL,
	`target_time` text,
	`time_zone` text,
	`is_all_day` integer DEFAULT true NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`show_when_expired` integer DEFAULT false NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`sort_order` integer,
	`priority` integer DEFAULT 0 NOT NULL,
	`variant` text DEFAULT 'default' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `countdowns_visible_idx` ON `countdowns` (`deleted_at`,`is_enabled`,`sort_order`);