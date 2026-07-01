"use server";

import { eq, desc, asc } from "drizzle-orm";
import { getDb, currentTimestamp, normalizeOptionalString } from "@/lib/db";
import { personnel, payrollRecord } from "@/lib/db/schema";
import type {
  Personnel,
  CreatePersonnelInput,
  UpdatePersonnelInput,
  DeletePersonnelBatchResult,
} from "@/lib/types";

function mapToPersonnel(row: any): Personnel {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender ?? null,
    ethnicity: row.ethnicity ?? null,
    nativePlace: row.nativePlace ?? null,
    idCardNumber: row.idCardNumber ?? null,
    payrollCardNumber: row.payrollCardNumber ?? null,
    bankName: row.bankName ?? null,
    jobType: row.jobType ?? null,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    phoneNumber: row.phoneNumber ?? null,
    remark: row.remark ?? null,
  };
}

export async function listPersonnel(): Promise<Personnel[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(personnel)
    .orderBy(asc(personnel.sortIndex), asc(personnel.id));
  return rows.map(mapToPersonnel);
}

export async function getPersonnelById(id: number): Promise<Personnel | null> {
  const db = getDb();
  const rows = await db.select().from(personnel).where(eq(personnel.id, id));
  return rows.length > 0 ? mapToPersonnel(rows[0]) : null;
}

export async function createPersonnel(
  input: CreatePersonnelInput
): Promise<Personnel> {
  const db = getDb();
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("姓名不能为空");
  }

  const maxResult = await db
    .select({ max: personnel.sortIndex })
    .from(personnel)
    .orderBy(desc(personnel.sortIndex))
    .limit(1);
  const nextSortIndex = (maxResult[0]?.max ?? -1) + 1;
  const updatedAt = currentTimestamp();

  try {
    const result = await db
      .insert(personnel)
      .values({
        name: trimmedName,
        sortIndex: nextSortIndex,
        gender: normalizeOptionalString(input.gender),
        ethnicity: normalizeOptionalString(input.ethnicity),
        nativePlace: normalizeOptionalString(input.nativePlace),
        idCardNumber: normalizeOptionalString(input.idCardNumber),
        payrollCardNumber: normalizeOptionalString(input.payrollCardNumber),
        bankName: normalizeOptionalString(input.bankName),
        jobType: normalizeOptionalString(input.jobType) || "砌砖",
        startDate: normalizeOptionalString(input.startDate),
        endDate: normalizeOptionalString(input.endDate),
        phoneNumber: normalizeOptionalString(input.phoneNumber),
        remark: normalizeOptionalString(input.remark),
        updatedAt,
      })
      .returning();
    return mapToPersonnel(result[0]);
  } catch (error: any) {
    if (
      error?.message?.includes("UNIQUE constraint failed: personnel.id_card_number")
    ) {
      throw new Error("身份证号码已存在");
    }
    throw error;
  }
}

export async function updatePersonnel(
  id: number,
  input: UpdatePersonnelInput
): Promise<Personnel | null> {
  const db = getDb();
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("姓名不能为空");
  }

  const updatedAt = currentTimestamp();

  try {
    const result = await db
      .update(personnel)
      .set({
        name: trimmedName,
        gender: normalizeOptionalString(input.gender),
        ethnicity: normalizeOptionalString(input.ethnicity),
        nativePlace: normalizeOptionalString(input.nativePlace),
        idCardNumber: normalizeOptionalString(input.idCardNumber),
        payrollCardNumber: normalizeOptionalString(input.payrollCardNumber),
        bankName: normalizeOptionalString(input.bankName),
        jobType: normalizeOptionalString(input.jobType),
        startDate: normalizeOptionalString(input.startDate),
        endDate: normalizeOptionalString(input.endDate),
        phoneNumber: normalizeOptionalString(input.phoneNumber),
        remark: normalizeOptionalString(input.remark),
        updatedAt,
      })
      .where(eq(personnel.id, id))
      .returning();
    return result.length > 0 ? mapToPersonnel(result[0]) : null;
  } catch (error: any) {
    if (
      error?.message?.includes("UNIQUE constraint failed: personnel.id_card_number")
    ) {
      throw new Error("身份证号码已存在");
    }
    throw error;
  }
}

export async function deletePersonnel(id: number): Promise<boolean> {
  const db = getDb();

  const existing = await db
    .select()
    .from(personnel)
    .where(eq(personnel.id, id));
  if (existing.length === 0) return false;

  const sheetIdsResult = await db
    .selectDistinct({ sheetId: payrollRecord.payrollSheetId })
    .from(payrollRecord)
    .where(eq(payrollRecord.personnelId, id));
  const sheetIds = sheetIdsResult.map((r) => r.sheetId);

  await db.delete(payrollRecord).where(eq(payrollRecord.personnelId, id));
  await db.delete(personnel).where(eq(personnel.id, id));

  const now = currentTimestamp();
  for (const sheetId of sheetIds) {
    const { payrollSheet } = await import("@/lib/db/schema");
    await db
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(eq(payrollSheet.id, sheetId));
  }

  return true;
}

export async function deletePersonnelBatch(
  ids: number[]
): Promise<DeletePersonnelBatchResult> {
  const db = getDb();
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return { deletedCount: 0 };
  }

  let deletedCount = 0;
  const now = currentTimestamp();

  for (const id of uniqueIds) {
    const existing = await db
      .select()
      .from(personnel)
      .where(eq(personnel.id, id));
    if (existing.length === 0) continue;

    const sheetIdsResult = await db
      .selectDistinct({ sheetId: payrollRecord.payrollSheetId })
      .from(payrollRecord)
      .where(eq(payrollRecord.personnelId, id));
    const sheetIds = sheetIdsResult.map((r) => r.sheetId);

    await db.delete(payrollRecord).where(eq(payrollRecord.personnelId, id));
    await db.delete(personnel).where(eq(personnel.id, id));

    const { payrollSheet } = await import("@/lib/db/schema");
    for (const sheetId of sheetIds) {
      await db
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(eq(payrollSheet.id, sheetId));
    }

    deletedCount++;
  }

  return { deletedCount };
}

export async function reorderPersonnel(orderedIds: number[]): Promise<void> {
  const db = getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(personnel)
      .set({ sortIndex: i })
      .where(eq(personnel.id, orderedIds[i]));
  }
}
