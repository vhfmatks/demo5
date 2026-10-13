ALTER TABLE `requests` ADD `execution_plan` text;--> statement-breakpoint
ALTER TABLE `requests` ADD `version` integer DEFAULT 1 NOT NULL;