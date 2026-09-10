CREATE TABLE `payroll_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payroll_sheet_id` int NOT NULL,
	`person_id` int NOT NULL,
	`actual_amount` bigint NOT NULL,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `payroll_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_records_sheet_person_unique` UNIQUE(`payroll_sheet_id`,`person_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `payroll_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) COLLATE utf8mb4_bin NOT NULL,
	`name_key` varbinary(320) GENERATED ALWAYS AS (CAST(name AS BINARY)) STORED,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `payroll_sheets_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_sheets_name_unique` UNIQUE(`name_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) COLLATE utf8mb4_bin NOT NULL,
	`name_key` varbinary(400) GENERATED ALWAYS AS (CAST(name AS BINARY)) STORED,
	`gender` varchar(100) COLLATE utf8mb4_bin,
	`ethnicity` varchar(100) COLLATE utf8mb4_bin,
	`native_place` varchar(100) COLLATE utf8mb4_bin,
	`id_card_number` varchar(100) COLLATE utf8mb4_bin,
	`salary_card_number` varchar(100) COLLATE utf8mb4_bin,
	`bank_name` varchar(100) COLLATE utf8mb4_bin,
	`phone` varchar(100) COLLATE utf8mb4_bin,
	`created_at` bigint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL DEFAULT 0,
	CONSTRAINT `persons_id` PRIMARY KEY(`id`),
	CONSTRAINT `persons_name_unique` UNIQUE(`name_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_payroll_sheet_id_payroll_sheets_id_fk` FOREIGN KEY (`payroll_sheet_id`) REFERENCES `payroll_sheets`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_person_id_persons_id_fk` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `payroll_records_sheet_id_idx` ON `payroll_records` (`payroll_sheet_id`);--> statement-breakpoint
CREATE INDEX `payroll_records_person_id_idx` ON `payroll_records` (`person_id`);
--> statement-breakpoint
-- 仅业务字段通过校验后维护时间；5.7 的 CHECK 不生效，因此校验放在触发器。
CREATE TRIGGER persons_insert BEFORE INSERT ON persons
FOR EACH ROW
BEGIN
 IF CHAR_LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.name,' ',''),CHAR(9),''),CHAR(10),''),CHAR(13),''),' ',''),'　','')) = 0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '名称不能全部为空白';
 END IF;
 IF NEW.gender IS NOT NULL AND BINARY NEW.gender NOT IN (BINARY '男', BINARY '女') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '性别必须是男或女';
 END IF;
 IF NEW.created_at = 0 THEN
  SET NEW.created_at = CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED);
 END IF;
 IF NEW.updated_at = 0 THEN
  SET NEW.updated_at = NEW.created_at;
 END IF;
END;
--> statement-breakpoint
-- 仅业务字段通过校验后维护时间；5.7 的 CHECK 不生效，因此校验放在触发器。
CREATE TRIGGER persons_updated_at BEFORE UPDATE ON persons
FOR EACH ROW
BEGIN
 IF CHAR_LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.name,' ',''),CHAR(9),''),CHAR(10),''),CHAR(13),''),' ',''),'　','')) = 0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '名称不能全部为空白';
 END IF;
 IF NEW.gender IS NOT NULL AND BINARY NEW.gender NOT IN (BINARY '男', BINARY '女') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '性别必须是男或女';
 END IF;
 IF NOT (BINARY OLD.name <=> BINARY NEW.name AND BINARY OLD.gender <=> BINARY NEW.gender AND BINARY OLD.ethnicity <=> BINARY NEW.ethnicity AND BINARY OLD.native_place <=> BINARY NEW.native_place AND BINARY OLD.id_card_number <=> BINARY NEW.id_card_number AND BINARY OLD.salary_card_number <=> BINARY NEW.salary_card_number AND BINARY OLD.bank_name <=> BINARY NEW.bank_name AND BINARY OLD.phone <=> BINARY NEW.phone) THEN
  SET NEW.updated_at = GREATEST(CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED), OLD.updated_at + 1);
 END IF;
END;
--> statement-breakpoint
-- 仅业务字段通过校验后维护时间；5.7 的 CHECK 不生效，因此校验放在触发器。
CREATE TRIGGER payroll_sheets_insert BEFORE INSERT ON payroll_sheets
FOR EACH ROW
BEGIN
 IF CHAR_LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.name,' ',''),CHAR(9),''),CHAR(10),''),CHAR(13),''),' ',''),'　','')) = 0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '名称不能全部为空白';
 END IF;
 IF NEW.created_at = 0 THEN
  SET NEW.created_at = CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED);
 END IF;
 IF NEW.updated_at = 0 THEN
  SET NEW.updated_at = NEW.created_at;
 END IF;
END;
--> statement-breakpoint
-- 仅业务字段通过校验后维护时间；5.7 的 CHECK 不生效，因此校验放在触发器。
CREATE TRIGGER payroll_sheets_updated_at BEFORE UPDATE ON payroll_sheets
FOR EACH ROW
BEGIN
 IF CHAR_LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.name,' ',''),CHAR(9),''),CHAR(10),''),CHAR(13),''),' ',''),'　','')) = 0 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '名称不能全部为空白';
 END IF;
 IF NOT (BINARY OLD.name <=> BINARY NEW.name) THEN
  SET NEW.updated_at = GREATEST(CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED), OLD.updated_at + 1);
 END IF;
END;
--> statement-breakpoint
-- 仅业务字段通过校验后维护时间；5.7 的 CHECK 不生效，因此校验放在触发器。
CREATE TRIGGER payroll_records_insert BEFORE INSERT ON payroll_records
FOR EACH ROW
BEGIN
 IF NEW.actual_amount < 0 OR NEW.actual_amount > 9007199254740991 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '工资金额超出允许范围';
 END IF;
 IF NEW.created_at = 0 THEN
  SET NEW.created_at = CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED);
 END IF;
 IF NEW.updated_at = 0 THEN
  SET NEW.updated_at = NEW.created_at;
 END IF;
END;
--> statement-breakpoint
-- 仅业务字段通过校验后维护时间；5.7 的 CHECK 不生效，因此校验放在触发器。
CREATE TRIGGER payroll_records_updated_at BEFORE UPDATE ON payroll_records
FOR EACH ROW
BEGIN
 IF NEW.actual_amount < 0 OR NEW.actual_amount > 9007199254740991 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '工资金额超出允许范围';
 END IF;
 IF NOT (OLD.payroll_sheet_id <=> NEW.payroll_sheet_id AND OLD.person_id <=> NEW.person_id AND OLD.actual_amount <=> NEW.actual_amount) THEN
  SET NEW.updated_at = GREATEST(CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED), OLD.updated_at + 1);
 END IF;
END;