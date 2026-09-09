import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/**
 * 三表的修改时间由增量迁移中的数据库触发器维护，以覆盖 Studio 和直接 SQL。
 * 人员表
 */
export const persons = sqliteTable(
  "persons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // 姓名：必填、唯一
    name: text("name").notNull(),

    // 男 / 女
    gender: text("gender", {
      enum: ["男", "女"],
    }),

    // 民族
    ethnicity: text("ethnicity"),

    // 籍贯
    nativePlace: text("native_place"),

    // 身份证号码
    idCardNumber: text("id_card_number"),

    // 工资卡号
    salaryCardNumber: text("salary_card_number"),

    // 开户行
    bankName: text("bank_name"),

    // 联系电话
    phone: text("phone"),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`),
  },
  (table) => [
    uniqueIndex("persons_name_unique").on(table.name),
    // 防止仅由常见空白字符组成的名称进入工资资料。
    check("persons_name_check", sql`length(trim(${table.name}, char(32, 9, 10, 13, 160, 12288))) > 0`),

    // 如果以后要确保身份证不能重复，可以启用：
    // uniqueIndex("persons_id_card_unique").on(table.idCardNumber),

    check(
      "persons_gender_check",
      sql`${table.gender} IS NULL OR ${table.gender} IN ('男', '女')`,
    ),
  ],
)

/**
 * 工资表
 *
 * 例如：
 * 2026年9月工资
 * 2026年10月工资
 */
export const payrollSheets = sqliteTable(
  "payroll_sheets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`),
  },
  (table) => [
    uniqueIndex("payroll_sheets_name_unique").on(table.name),
    // 防止仅由常见空白字符组成的名称进入工资资料。
    check("payroll_sheets_name_check", sql`length(trim(${table.name}, char(32, 9, 10, 13, 160, 12288))) > 0`),
  ],
)

/**
 * 工资记录
 */
export const payrollRecords = sqliteTable(
  "payroll_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    payrollSheetId: integer("payroll_sheet_id")
      .notNull()
      .references(() => payrollSheets.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    personId: integer("person_id")
      .notNull()
      .references(() => persons.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    /**
     * 实发金额
     *
     * 单位：分
     *
     * 例如：
     * ¥1234.56 => 123456
     */
    actualAmount: integer("actual_amount").notNull(),

    createdAt: integer("created_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`),

    updatedAt: integer("updated_at", {
      mode: "timestamp_ms",
    })
      .notNull()
      .default(sql`(CAST(unixepoch('subsecond') * 1000 AS INTEGER))`),
  },
  (table) => [
    index("payroll_records_sheet_id_idx").on(table.payrollSheetId),
    index("payroll_records_person_id_idx").on(table.personId),

    /**
     * 同一个工资表里，一个人只能出现一次
     */
    uniqueIndex("payroll_records_sheet_person_unique").on(
      table.payrollSheetId,
      table.personId,
    ),

    check(
      "payroll_records_actual_amount_check",
      sql`typeof(${table.actualAmount}) = 'integer' AND ${table.actualAmount} BETWEEN 0 AND 9007199254740991`,
    ),
  ],
)