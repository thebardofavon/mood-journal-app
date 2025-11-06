CREATE TABLE `entry_embedding` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`embedding` text NOT NULL,
	`embedding_model` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX `tag_name_unique`;--> statement-breakpoint
DROP INDEX `user_email_unique`;--> statement-breakpoint
DROP INDEX `user_username_unique`;