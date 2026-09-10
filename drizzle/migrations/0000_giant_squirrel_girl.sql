CREATE TABLE `payroll_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payroll_sheet_id` int NOT NULL,
	`person_id` int NOT NULL,
	`actual_amount` bigint NOT NULL,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `payroll_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_records_sheet_person_unique` UNIQUE(`payroll_sheet_id`,`person_id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`name_key` varbinary(320) GENERATED ALWAYS AS (CAST(name AS BINARY)) STORED,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `payroll_sheets_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_sheets_name_unique` UNIQUE(`name_key`)
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`name_key` varbinary(400) GENERATED ALWAYS AS (CAST(name AS BINARY)) STORED,
	`gender` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`ethnicity` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`native_place` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`sensitive_info` text,
	`bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `persons_id` PRIMARY KEY(`id`),
	CONSTRAINT `persons_name_unique` UNIQUE(`name_key`)
);
--> statement-breakpoint
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_payroll_sheet_id_payroll_sheets_id_fk` FOREIGN KEY (`payroll_sheet_id`) REFERENCES `payroll_sheets`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `payroll_records_sheet_id_idx` ON `payroll_records` (`payroll_sheet_id`);--> statement-breakpoint
CREATE INDEX `payroll_records_person_id_idx` ON `payroll_records` (`person_id`);--> statement-breakpoint
CREATE INDEX `payroll_records_person_time_idx` ON `payroll_records` (`person_id`,`created_at`);