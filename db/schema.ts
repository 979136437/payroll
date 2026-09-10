import { sql } from "drizzle-orm";
import { bigint, customType, index, int, mysqlTable, uniqueIndex } from "drizzle-orm/mysql-core";

// 5.7 文本排序规则会忽略尾随空格，名称唯一性由二进制生成列保障。
const exactText = customType<{ data: string; driverData: string; config: { length: number } }>({
  dataType: (config) => `varchar(${config!.length}) COLLATE utf8mb4_bin`,
});
const milliseconds = customType<{ data: Date; driverData: string | number }>({
  dataType: () => "bigint",
  toDriver: (value) => value.getTime(),
  fromDriver: (value) => new Date(Number(value)),
});
// 5.7 不支持毫秒表达式默认值；0 为未提供标记，由插入触发器填充时间。
const timestamps = () => ({
  createdAt: milliseconds("created_at").notNull().default(sql`0`),
  updatedAt: milliseconds("updated_at").notNull().default(sql`0`),
});
const binaryName = customType<{ data: Buffer; driverData: Buffer; config: { length: number } }>({
  dataType: config => `varbinary(${config!.length})`,
});
export const persons = mysqlTable("persons", {
  id: int("id").autoincrement().primaryKey(),
  name: exactText("name", { length: 100 }).notNull(),
  nameKey: binaryName("name_key", { length: 400 }).generatedAlwaysAs(sql`CAST(name AS BINARY)`, { mode: "stored" }),
  gender: exactText("gender", { length: 100 }),
  ethnicity: exactText("ethnicity", { length: 100 }),
  nativePlace: exactText("native_place", { length: 100 }),
  idCardNumber: exactText("id_card_number", { length: 100 }),
  salaryCardNumber: exactText("salary_card_number", { length: 100 }),
  bankName: exactText("bank_name", { length: 100 }),
  phone: exactText("phone", { length: 100 }),
  ...timestamps(),
}, table => [
  uniqueIndex("persons_name_unique").on(table.nameKey),
]);
export const payrollSheets = mysqlTable("payroll_sheets", {
  id: int("id").autoincrement().primaryKey(),
  name: exactText("name", { length: 80 }).notNull(),
  nameKey: binaryName("name_key", { length: 320 }).generatedAlwaysAs(sql`CAST(name AS BINARY)`, { mode: "stored" }),
  ...timestamps(),
}, table => [
  uniqueIndex("payroll_sheets_name_unique").on(table.nameKey),
]);
export const payrollRecords = mysqlTable("payroll_records", {
  id: int("id").autoincrement().primaryKey(),
  payrollSheetId: int("payroll_sheet_id").notNull().references(() => payrollSheets.id, { onDelete: "restrict", onUpdate: "cascade" }),
  personId: int("person_id").notNull().references(() => persons.id, { onDelete: "restrict", onUpdate: "cascade" }),
  // 单位为整数分；调用者仍须在写入前验证安全整数，MySQL 会转换非整数输入。
  actualAmount: bigint("actual_amount", { mode: "number" }).notNull(),
  ...timestamps(),
}, table => [
  index("payroll_records_sheet_id_idx").on(table.payrollSheetId),
  index("payroll_records_person_id_idx").on(table.personId),
  uniqueIndex("payroll_records_sheet_person_unique").on(table.payrollSheetId, table.personId),
]);