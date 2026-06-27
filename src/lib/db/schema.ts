import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const personnel = sqliteTable("personnel", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortIndex: integer("sort_index").notNull().default(0),
  gender: text("gender"),
  ethnicity: text("ethnicity"),
  nativePlace: text("native_place"),
  idCardNumber: text("id_card_number").unique(),
  payrollCardNumber: text("payroll_card_number"),
  bankName: text("bank_name"),
  jobType: text("job_type"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  phoneNumber: text("phone_number"),
  remark: text("remark"),
  updatedAt: text("updated_at").notNull(),
});

export const payrollSheet = sqliteTable("payroll_sheet", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  updatedAt: text("updated_at").notNull(),
});

export const payrollRecord = sqliteTable(
  "payroll_record",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    payrollSheetId: integer("payroll_sheet_id").notNull(),
    personnelId: integer("personnel_id").notNull(),
    exportWeight: integer("export_weight"),
    attendanceDays: real("attendance_days"),
    wageStandard: real("wage_standard"),
    grossPay: real("gross_pay"),
    deductionAmount: real("deduction_amount"),
    netPay: real("net_pay").notNull(),
    payeeSignature: text("payee_signature"),
    remark: text("remark"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => {
    return {
      unqSheetPersonnel: unique("unq_payroll_sheet_personnel").on(
        table.payrollSheetId,
        table.personnelId
      ),
    };
  }
);

export type Personnel = typeof personnel.$inferSelect;
export type NewPersonnel = typeof personnel.$inferInsert;
export type PayrollSheet = typeof payrollSheet.$inferSelect;
export type NewPayrollSheet = typeof payrollSheet.$inferInsert;
export type PayrollRecord = typeof payrollRecord.$inferSelect;
export type NewPayrollRecord = typeof payrollRecord.$inferInsert;
