CREATE TABLE `payroll_record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payroll_sheet_id` integer NOT NULL,
	`personnel_id` integer NOT NULL,
	`export_weight` integer,
	`attendance_days` real,
	`wage_standard` real,
	`gross_pay` real,
	`deduction_amount` real,
	`net_pay` real NOT NULL,
	`payee_signature` text,
	`remark` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`payroll_sheet_id`) REFERENCES `payroll_sheet`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`personnel_id`) REFERENCES `personnel`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_record_payroll_sheet_id_personnel_id_unique` ON `payroll_record` (`payroll_sheet_id`,`personnel_id`);--> statement-breakpoint
CREATE TABLE `payroll_sheet` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_sheet_name_unique` ON `payroll_sheet` (`name`);--> statement-breakpoint
CREATE TABLE `personnel` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_index` integer DEFAULT 0 NOT NULL,
	`gender` text,
	`ethnicity` text,
	`native_place` text,
	`id_card_number` text,
	`payroll_card_number` text,
	`bank_name` text,
	`job_type` text,
	`start_date` text,
	`end_date` text,
	`phone_number` text,
	`remark` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personnel_id_card_number_unique` ON `personnel` (`id_card_number`);