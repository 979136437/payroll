"use server";

import { eq, desc, asc, and, inArray, sql } from "drizzle-orm";
import { getDb, currentTimestamp } from "@/lib/db";
import { payrollSheet, payrollRecord, personnel } from "@/lib/db/schema";
import type {
  PayrollSheetSummary,
  CreatePayrollSheetInput,
  PayrollSheetDetail,
  PayrollSheetRecordRow,
  DeletePayrollSheetResult,
} from "@/lib/types";

function mapToSheetSummary(row: any): PayrollSheetSummary {
  return {
    id: row.id,
    name: row.name,
    personnelCount: row.personnelCount ?? 0,
    totalNetPay: row.totalNetPay ?? 0,
    updatedAt: row.updatedAt,
  };
}

function mapToRecordRow(row: any): PayrollSheetRecordRow {
  return {
    recordId: row.recordId,
    personnelId: row.personnelId,
    name: row.name,
    idCardNumber: row.idCardNumber ?? null,
    payrollCardNumber: row.payrollCardNumber ?? null,
    bankName: row.bankName ?? null,
    exportWeight: row.exportWeight ?? null,
    attendanceDays: row.attendanceDays ?? null,
    wageStandard: row.wageStandard ?? null,
    grossPay: row.grossPay ?? null,
    deductionAmount: row.deductionAmount ?? null,
    phoneNumber: row.phoneNumber ?? null,
    netPay: row.netPay,
    payeeSignature: row.payeeSignature ?? null,
    remark: row.remark ?? null,
  };
}

export async function listPayrollSheets(): Promise<PayrollSheetSummary[]> {
  const db = getDb();

  const result = await db
    .select({
      id: payrollSheet.id,
      name: payrollSheet.name,
      updatedAt: payrollSheet.updatedAt,
      personnelCount: sql<number>`COUNT(${payrollRecord.id})`,
      totalNetPay: sql<number>`COALESCE(SUM(${payrollRecord.netPay}), 0)`,
    })
    .from(payrollSheet)
    .leftJoin(
      payrollRecord,
      eq(payrollRecord.payrollSheetId, payrollSheet.id)
    )
    .groupBy(payrollSheet.id, payrollSheet.name, payrollSheet.updatedAt)
    .orderBy(desc(payrollSheet.updatedAt), desc(payrollSheet.id));

  return result.map(mapToSheetSummary);
}

export async function createPayrollSheet(
  input: CreatePayrollSheetInput
): Promise<PayrollSheetSummary> {
  const db = getDb();
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("工资表名称不能为空");
  }

  const now = currentTimestamp();

  try {
    const sheetId = db.transaction((tx) => {
      const result = tx
        .insert(payrollSheet)
        .values({
          name: trimmedName,
          updatedAt: now,
        })
        .returning()
        .all();
      const createdSheetId = result[0].id;

      if (input.sourceSheetId) {
        const sourceRecords = tx
          .select({ personnelId: payrollRecord.personnelId })
          .from(payrollRecord)
          .where(eq(payrollRecord.payrollSheetId, input.sourceSheetId))
          .orderBy(asc(payrollRecord.id))
          .all();

        for (const record of sourceRecords) {
          tx
            .insert(payrollRecord)
            .values({
              payrollSheetId: createdSheetId,
              personnelId: record.personnelId,
              netPay: 0,
              updatedAt: now,
            })
            .onConflictDoNothing()
            .run();
        }
      }

      return createdSheetId;
    });

    return getPayrollSheetSummary(sheetId);
  } catch (error: any) {
    if (
      error?.message?.includes("UNIQUE constraint failed: payroll_sheet.name")
    ) {
      throw new Error("工资表名称已存在");
    }
    throw error;
  }
}

async function getPayrollSheetSummary(
  sheetId: number
): Promise<PayrollSheetSummary> {
  const db = getDb();

  const result = await db
    .select({
      id: payrollSheet.id,
      name: payrollSheet.name,
      updatedAt: payrollSheet.updatedAt,
      personnelCount: sql<number>`COUNT(${payrollRecord.id})`,
      totalNetPay: sql<number>`COALESCE(SUM(${payrollRecord.netPay}), 0)`,
    })
    .from(payrollSheet)
    .leftJoin(
      payrollRecord,
      eq(payrollRecord.payrollSheetId, payrollSheet.id)
    )
    .where(eq(payrollSheet.id, sheetId))
    .groupBy(payrollSheet.id, payrollSheet.name, payrollSheet.updatedAt);

  if (result.length === 0) {
    throw new Error("工资表不存在");
  }

  return mapToSheetSummary(result[0]);
}

export async function getPayrollSheetDetail(
  sheetId: number
): Promise<PayrollSheetDetail | null> {
  const db = getDb();

  const sheetSummary = await db
    .select()
    .from(payrollSheet)
    .where(eq(payrollSheet.id, sheetId));

  if (sheetSummary.length === 0) return null;

  const sheet = await getPayrollSheetSummary(sheetId);

  const records = await db
    .select({
      recordId: payrollRecord.id,
      personnelId: payrollRecord.personnelId,
      name: personnel.name,
      idCardNumber: personnel.idCardNumber,
      payrollCardNumber: personnel.payrollCardNumber,
      bankName: personnel.bankName,
      exportWeight: payrollRecord.exportWeight,
      attendanceDays: payrollRecord.attendanceDays,
      wageStandard: payrollRecord.wageStandard,
      grossPay: payrollRecord.grossPay,
      deductionAmount: payrollRecord.deductionAmount,
      phoneNumber: personnel.phoneNumber,
      netPay: payrollRecord.netPay,
      payeeSignature: payrollRecord.payeeSignature,
      remark: payrollRecord.remark,
    })
    .from(payrollRecord)
    .innerJoin(personnel, eq(personnel.id, payrollRecord.personnelId))
    .where(eq(payrollRecord.payrollSheetId, sheetId))
    .orderBy(asc(payrollRecord.id));

  return {
    sheet,
    records: records.map(mapToRecordRow),
  };
}

export async function deletePayrollSheet(
  sheetId: number
): Promise<DeletePayrollSheetResult> {
  const db = getDb();

  return db.transaction((tx) => {
    const existing = tx
      .select({ id: payrollSheet.id })
      .from(payrollSheet)
      .where(eq(payrollSheet.id, sheetId))
      .all();
    if (existing.length === 0) {
      return { deleted: false };
    }

    tx
      .delete(payrollRecord)
      .where(eq(payrollRecord.payrollSheetId, sheetId))
      .run();
    tx.delete(payrollSheet).where(eq(payrollSheet.id, sheetId)).run();

    return { deleted: true };
  });
}

export async function addPersonnelToSheet(
  sheetId: number,
  personnelIds: number[],
  options?: {
    defaultNetPay?: number;
    perPersonNetPay?: Record<number, number>;
  }
): Promise<void> {
  const db = getDb();
  const now = currentTimestamp();
  const uniqueIds = Array.from(new Set(personnelIds));

  db.transaction((tx) => {
    for (const pid of uniqueIds) {
      const netPay = options?.perPersonNetPay?.[pid] ?? options?.defaultNetPay ?? 0;
      tx
        .insert(payrollRecord)
        .values({
          payrollSheetId: sheetId,
          personnelId: pid,
          netPay,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .run();
    }

    tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(eq(payrollSheet.id, sheetId))
      .run();
  });
}

export async function removePersonnelFromSheet(
  sheetId: number,
  personnelIds: number[]
): Promise<void> {
  const db = getDb();
  const uniqueIds = Array.from(new Set(personnelIds));

  if (uniqueIds.length === 0) return;

  const now = currentTimestamp();
  db.transaction((tx) => {
    tx
      .delete(payrollRecord)
      .where(
        and(
          eq(payrollRecord.payrollSheetId, sheetId),
          inArray(payrollRecord.personnelId, uniqueIds)
        )
      )
      .run();

    tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(eq(payrollSheet.id, sheetId))
      .run();
  });
}

export async function updatePayrollRecordNetPay(
  recordId: number,
  netPay: number
): Promise<PayrollSheetRecordRow | null> {
  const db = getDb();
  const now = currentTimestamp();

  const result = db.transaction((tx) => {
    const updated = tx
      .update(payrollRecord)
      .set({ netPay, updatedAt: now })
      .where(eq(payrollRecord.id, recordId))
      .returning()
      .all();

    if (updated.length > 0) {
      tx
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(eq(payrollSheet.id, updated[0].payrollSheetId))
        .run();
    }

    return updated;
  });

  if (result.length === 0) return null;

  return getPayrollRecordRow(recordId);
}

export async function updatePayrollRecordExportWeight(
  recordId: number,
  exportWeight: number | null
): Promise<PayrollSheetRecordRow | null> {
  const db = getDb();
  const now = currentTimestamp();

  const result = db.transaction((tx) => {
    const updated = tx
      .update(payrollRecord)
      .set({ exportWeight, updatedAt: now })
      .where(eq(payrollRecord.id, recordId))
      .returning()
      .all();

    if (updated.length > 0) {
      tx
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(eq(payrollSheet.id, updated[0].payrollSheetId))
        .run();
    }

    return updated;
  });

  if (result.length === 0) return null;

  return getPayrollRecordRow(recordId);
}

async function getPayrollRecordRow(
  recordId: number
): Promise<PayrollSheetRecordRow | null> {
  const db = getDb();

  const result = await db
    .select({
      recordId: payrollRecord.id,
      personnelId: payrollRecord.personnelId,
      name: personnel.name,
      idCardNumber: personnel.idCardNumber,
      payrollCardNumber: personnel.payrollCardNumber,
      bankName: personnel.bankName,
      exportWeight: payrollRecord.exportWeight,
      attendanceDays: payrollRecord.attendanceDays,
      wageStandard: payrollRecord.wageStandard,
      grossPay: payrollRecord.grossPay,
      deductionAmount: payrollRecord.deductionAmount,
      phoneNumber: personnel.phoneNumber,
      netPay: payrollRecord.netPay,
      payeeSignature: payrollRecord.payeeSignature,
      remark: payrollRecord.remark,
    })
    .from(payrollRecord)
    .innerJoin(personnel, eq(personnel.id, payrollRecord.personnelId))
    .where(eq(payrollRecord.id, recordId));

  return result.length > 0 ? mapToRecordRow(result[0]) : null;
}
