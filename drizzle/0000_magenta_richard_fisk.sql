CREATE TABLE `payroll_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payroll_sheet_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	`actual_amount` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsecond') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsecond') * 1000) NOT NULL,
	FOREIGN KEY (`payroll_sheet_id`) REFERENCES `payroll_sheets`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "payroll_records_actual_amount_check" CHECK("payroll_records"."actual_amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `payroll_records_sheet_id_idx` ON `payroll_records` (`payroll_sheet_id`);--> statement-breakpoint
CREATE INDEX `payroll_records_person_id_idx` ON `payroll_records` (`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_records_sheet_person_unique` ON `payroll_records` (`payroll_sheet_id`,`person_id`);--> statement-breakpoint
CREATE TABLE `payroll_sheets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsecond') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsecond') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_sheets_name_unique` ON `payroll_sheets` (`name`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`gender` text,
	`ethnicity` text,
	`native_place` text,
	`id_card_number` text,
	`salary_card_number` text,
	`bank_name` text,
	`phone` text,
	`created_at` integer DEFAULT (unixepoch('subsecond') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsecond') * 1000) NOT NULL,
	CONSTRAINT "persons_gender_check" CHECK("persons"."gender" IS NULL OR "persons"."gender" IN ('男', '女'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persons_name_unique` ON `persons` (`name`);