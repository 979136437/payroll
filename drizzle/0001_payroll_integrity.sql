-- 在迁移事务内先检查旧数据，失败时保留全部原始数据及迁移历史。
CREATE TEMP TABLE __payroll_upgrade_guard (
 amount_ok INTEGER CONSTRAINT payroll_upgrade_invalid_amount CHECK (amount_ok = 1),
 names_ok INTEGER CONSTRAINT payroll_upgrade_invalid_name CHECK (names_ok = 1),
 relations_ok INTEGER CONSTRAINT payroll_upgrade_invalid_relation CHECK (relations_ok = 1)
);
--> statement-breakpoint
INSERT INTO __payroll_upgrade_guard VALUES (
 NOT EXISTS (SELECT 1 FROM payroll_records WHERE typeof(actual_amount) != 'integer' OR actual_amount NOT BETWEEN 0 AND 9007199254740991),
 NOT EXISTS (SELECT 1 FROM persons WHERE length(trim(name, char(32, 9, 10, 13, 160, 12288))) = 0 UNION ALL SELECT 1 FROM payroll_sheets WHERE length(trim(name, char(32, 9, 10, 13, 160, 12288))) = 0),
 NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check)
);
--> statement-breakpoint
-- 保存曾使用过的最大编号，包括目前已经没有对应记录的编号。
CREATE TEMP TABLE __payroll_upgrade_sequences AS SELECT name, seq FROM sqlite_sequence WHERE name IN ('persons', 'payroll_sheets', 'payroll_records');
--> statement-breakpoint
CREATE TABLE __new_persons (
 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `name` text NOT NULL,
 `gender` text,
 `ethnicity` text,
 `native_place` text,
 `id_card_number` text,
 `salary_card_number` text,
 `bank_name` text,
 `phone` text,
 `created_at` integer NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
 `updated_at` integer NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
 CONSTRAINT persons_gender_check CHECK ("gender" IS NULL OR "gender" IN ('男', '女')),
 CONSTRAINT persons_name_check CHECK (length(trim("name", char(32, 9, 10, 13, 160, 12288))) > 0)
);
--> statement-breakpoint
INSERT INTO __new_persons (`id`, `name`, `gender`, `ethnicity`, `native_place`, `id_card_number`, `salary_card_number`, `bank_name`, `phone`, `created_at`, `updated_at`) SELECT `id`, `name`, `gender`, `ethnicity`, `native_place`, `id_card_number`, `salary_card_number`, `bank_name`, `phone`, `created_at`, `updated_at` FROM persons;
--> statement-breakpoint
CREATE TABLE __new_payroll_sheets (
 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `name` text NOT NULL,
 `created_at` integer NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
 `updated_at` integer NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
 CONSTRAINT payroll_sheets_name_check CHECK (length(trim("name", char(32, 9, 10, 13, 160, 12288))) > 0)
);
--> statement-breakpoint
INSERT INTO __new_payroll_sheets (`id`, `name`, `created_at`, `updated_at`) SELECT `id`, `name`, `created_at`, `updated_at` FROM payroll_sheets;
--> statement-breakpoint
CREATE TABLE __new_payroll_records (
 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `payroll_sheet_id` integer NOT NULL,
 `person_id` integer NOT NULL,
 `actual_amount` integer NOT NULL,
 `created_at` integer NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
 `updated_at` integer NOT NULL DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
 FOREIGN KEY (payroll_sheet_id) REFERENCES __new_payroll_sheets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (person_id) REFERENCES __new_persons(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT payroll_records_actual_amount_check CHECK (typeof("actual_amount") = 'integer' AND "actual_amount" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
INSERT INTO __new_payroll_records (`id`, `payroll_sheet_id`, `person_id`, `actual_amount`, `created_at`, `updated_at`) SELECT `id`, `payroll_sheet_id`, `person_id`, `actual_amount`, `created_at`, `updated_at` FROM payroll_records;
--> statement-breakpoint
-- 先替换子表，再替换父表，全程保持外键检查开启。
DROP TABLE payroll_records;
--> statement-breakpoint
DROP TABLE persons;
--> statement-breakpoint
DROP TABLE payroll_sheets;
--> statement-breakpoint
ALTER TABLE __new_persons RENAME TO persons;
--> statement-breakpoint
ALTER TABLE __new_payroll_sheets RENAME TO payroll_sheets;
--> statement-breakpoint
ALTER TABLE __new_payroll_records RENAME TO payroll_records;
--> statement-breakpoint
CREATE INDEX payroll_records_sheet_id_idx ON payroll_records (payroll_sheet_id);
--> statement-breakpoint
CREATE INDEX payroll_records_person_id_idx ON payroll_records (person_id);
--> statement-breakpoint
CREATE UNIQUE INDEX payroll_records_sheet_person_unique ON payroll_records (payroll_sheet_id, person_id);
--> statement-breakpoint
UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT seq FROM __payroll_upgrade_sequences WHERE name = 'payroll_records'), 0)) WHERE name = 'payroll_records';
--> statement-breakpoint
-- 仅响应业务字段实际变化，避免时间字段更新再次触发；同毫秒内仍保持递增。
CREATE TRIGGER payroll_records_updated_at AFTER UPDATE OF payroll_sheet_id, person_id, actual_amount ON payroll_records
WHEN OLD.payroll_sheet_id IS NOT NEW.payroll_sheet_id OR OLD.person_id IS NOT NEW.person_id OR OLD.actual_amount IS NOT NEW.actual_amount
BEGIN
 UPDATE payroll_records SET updated_at = MAX(CAST(unixepoch('subsecond') * 1000 AS INTEGER), OLD.updated_at + 1) WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE UNIQUE INDEX payroll_sheets_name_unique ON payroll_sheets (name);
--> statement-breakpoint
UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT seq FROM __payroll_upgrade_sequences WHERE name = 'payroll_sheets'), 0)) WHERE name = 'payroll_sheets';
--> statement-breakpoint
-- 仅响应业务字段实际变化，避免时间字段更新再次触发；同毫秒内仍保持递增。
CREATE TRIGGER payroll_sheets_updated_at AFTER UPDATE OF name ON payroll_sheets
WHEN OLD.name IS NOT NEW.name
BEGIN
 UPDATE payroll_sheets SET updated_at = MAX(CAST(unixepoch('subsecond') * 1000 AS INTEGER), OLD.updated_at + 1) WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE UNIQUE INDEX persons_name_unique ON persons (name);
--> statement-breakpoint
UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT seq FROM __payroll_upgrade_sequences WHERE name = 'persons'), 0)) WHERE name = 'persons';
--> statement-breakpoint
-- 仅响应业务字段实际变化，避免时间字段更新再次触发；同毫秒内仍保持递增。
CREATE TRIGGER persons_updated_at AFTER UPDATE OF name, gender, ethnicity, native_place, id_card_number, salary_card_number, bank_name, phone ON persons
WHEN OLD.name IS NOT NEW.name OR OLD.gender IS NOT NEW.gender OR OLD.ethnicity IS NOT NEW.ethnicity OR OLD.native_place IS NOT NEW.native_place OR OLD.id_card_number IS NOT NEW.id_card_number OR OLD.salary_card_number IS NOT NEW.salary_card_number OR OLD.bank_name IS NOT NEW.bank_name OR OLD.phone IS NOT NEW.phone
BEGIN
 UPDATE persons SET updated_at = MAX(CAST(unixepoch('subsecond') * 1000 AS INTEGER), OLD.updated_at + 1) WHERE id = NEW.id;
END;
--> statement-breakpoint
INSERT INTO __payroll_upgrade_guard (relations_ok) SELECT NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check);
--> statement-breakpoint
DROP TABLE __payroll_upgrade_sequences;
--> statement-breakpoint
DROP TABLE __payroll_upgrade_guard;
