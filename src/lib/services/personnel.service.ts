import { eq, desc, asc } from "drizzle-orm";
import { getDb, currentTimestamp, normalizeOptionalString } from "@/lib/db";
import { personnel, payrollRecord, payrollSheet } from "@/lib/db/schema";
import type {
  Personnel,
  CreatePersonnelInput,
  UpdatePersonnelInput,
  DeletePersonnelBatchResult,
} from "@/lib/types";

export const PERSONNEL_REORDER_INPUT_ERROR = "排序人员列表必须完整且不重复";

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

  return db.transaction((tx) => {
    const existing = tx
      .select({ id: personnel.id })
      .from(personnel)
      .where(eq(personnel.id, id))
      .all();
    if (existing.length === 0) return false;

    const sheetIds = tx
      .selectDistinct({ sheetId: payrollRecord.payrollSheetId })
      .from(payrollRecord)
      .where(eq(payrollRecord.personnelId, id))
      .all()
      .map((row) => row.sheetId);

    tx.delete(payrollRecord).where(eq(payrollRecord.personnelId, id)).run();
    tx.delete(personnel).where(eq(personnel.id, id)).run();

    const now = currentTimestamp();
    for (const sheetId of sheetIds) {
      tx
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(eq(payrollSheet.id, sheetId))
        .run();
    }

    return true;
  });
}

export async function deletePersonnelBatch(
  ids: number[]
): Promise<DeletePersonnelBatchResult> {
  const db = getDb();
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return { deletedCount: 0 };
  }

  return db.transaction((tx) => {
    let deletedCount = 0;
    const affectedSheetIds = new Set<number>();

    for (const id of uniqueIds) {
      const existing = tx
        .select({ id: personnel.id })
        .from(personnel)
        .where(eq(personnel.id, id))
        .all();
      if (existing.length === 0) continue;

      const sheetIds = tx
        .selectDistinct({ sheetId: payrollRecord.payrollSheetId })
        .from(payrollRecord)
        .where(eq(payrollRecord.personnelId, id))
        .all();
      sheetIds.forEach(({ sheetId }) => affectedSheetIds.add(sheetId));

      tx.delete(payrollRecord).where(eq(payrollRecord.personnelId, id)).run();
      tx.delete(personnel).where(eq(personnel.id, id)).run();
      deletedCount++;
    }

    const now = currentTimestamp();
    for (const sheetId of affectedSheetIds) {
      tx
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(eq(payrollSheet.id, sheetId))
        .run();
    }

    return { deletedCount };
  });
}

export async function reorderPersonnel(orderedIds: number[]): Promise<void> {
  const db = getDb();
  db.transaction((tx) => {
    const currentIds = tx
      .select({ id: personnel.id })
      .from(personnel)
      .all()
      .map((row) => row.id);
    const uniqueIds = new Set(orderedIds);
    const currentIdSet = new Set(currentIds);
    const isCompletePermutation =
      orderedIds.length === currentIds.length &&
      uniqueIds.size === orderedIds.length &&
      orderedIds.every((id) => currentIdSet.has(id));

    if (!isCompletePermutation) {
      throw new Error(PERSONNEL_REORDER_INPUT_ERROR);
    }

    for (let i = 0; i < orderedIds.length; i++) {
      tx
        .update(personnel)
        .set({ sortIndex: i })
        .where(eq(personnel.id, orderedIds[i]))
        .run();
    }
  });
}
