CREATE TABLE `user_achievement` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`unlocked` integer DEFAULT false NOT NULL,
	`unlocked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`total_xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
