import { getDb, personnel, payrollSheet, payrollRecord } from '../database'
import { eq, inArray, asc, sql } from 'drizzle-orm'

export interface PersonnelSummary {
  id: number
  name: string
  sortIndex: number
  gender: string | null
  ethnicity: string | null
  nativePlace: string | null
  idCardNumber: string | null
  payrollCardNumber: string | null
  bankName: string | null
  jobType: string | null
  startDate: string | null
  endDate: string | null
  phoneNumber: string | null
  remark: string | null
  updatedAt: string
}

export interface CreatePersonnelInput {
  name: string
  gender?: string | null
  ethnicity?: string | null
  nativePlace?: string | null
  idCardNumber?: string | null
  payrollCardNumber?: string | null
  bankName?: string | null
  jobType?: string | null
  startDate?: string | null
  endDate?: string | null
  phoneNumber?: string | null
  remark?: string | null
}

export type UpdatePersonnelInput = Partial<CreatePersonnelInput>

function nowTimestamp(): string {
  return String(Math.floor(Date.now() / 1000))
}

function emptyStringToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toPersonnelSummary(row: typeof personnel.$inferSelect): PersonnelSummary {
  return {
    id: row.id,
    name: row.name,
    sortIndex: row.sortIndex,
    gender: row.gender,
    ethnicity: row.ethnicity,
    nativePlace: row.nativePlace,
    idCardNumber: row.idCardNumber,
    payrollCardNumber: row.payrollCardNumber,
    bankName: row.bankName,
    jobType: row.jobType,
    startDate: row.startDate,
    endDate: row.endDate,
    phoneNumber: row.phoneNumber,
    remark: row.remark,
    updatedAt: row.updatedAt,
  }
}

export async function listPersonnel(): Promise<PersonnelSummary[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(personnel)
    .orderBy(asc(personnel.sortIndex), asc(personnel.id))
    .all()
  return rows.map(toPersonnelSummary)
}

export async function getPersonnelById(id: number): Promise<PersonnelSummary | null> {
  const db = getDb()
  const row = await db
    .select()
    .from(personnel)
    .where(eq(personnel.id, id))
    .get()
  return row ? toPersonnelSummary(row) : null
}

export async function getPersonnel(id: number): Promise<PersonnelSummary | null> {
  return getPersonnelById(id)
}

export async function createPersonnel(input: CreatePersonnelInput): Promise<PersonnelSummary> {
  const db = getDb()
  const name = input.name.trim()
  if (!name) {
    throw new Error('姓名不能为空')
  }

  const result = await db
    .select({ maxSortIndex: sql<number>`max(${personnel.sortIndex})` })
    .from(personnel)
    .get()
  const maxSortIndex = result?.maxSortIndex ?? 0
  const nextSortIndex = maxSortIndex + 1

  const now = nowTimestamp()

  try {
    const inserted = await db
      .insert(personnel)
      .values({
        name,
        sortIndex: nextSortIndex,
        gender: emptyStringToNull(input.gender),
        ethnicity: emptyStringToNull(input.ethnicity),
        nativePlace: emptyStringToNull(input.nativePlace),
        idCardNumber: emptyStringToNull(input.idCardNumber),
        payrollCardNumber: emptyStringToNull(input.payrollCardNumber),
        bankName: emptyStringToNull(input.bankName),
        jobType: emptyStringToNull(input.jobType),
        startDate: emptyStringToNull(input.startDate),
        endDate: emptyStringToNull(input.endDate),
        phoneNumber: emptyStringToNull(input.phoneNumber),
        remark: emptyStringToNull(input.remark),
        updatedAt: now,
      })
      .returning()
      .get()

    return toPersonnelSummary(inserted)
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed') && error?.message?.includes('id_card_number')) {
      throw new Error('身份证号码已存在')
    }
    throw error
  }
}

export async function updatePersonnel(
  id: number,
  input: UpdatePersonnelInput
): Promise<PersonnelSummary | null> {
  const db = getDb()

  const existing = await db
    .select()
    .from(personnel)
    .where(eq(personnel.id, id))
    .get()
  if (!existing) {
    return null
  }

  const updateData: Record<string, any> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      throw new Error('姓名不能为空')
    }
    updateData.name = name
  }

  const fieldsToUpdate: (keyof Omit<CreatePersonnelInput, 'name'>)[] = [
    'gender',
    'ethnicity',
    'nativePlace',
    'idCardNumber',
    'payrollCardNumber',
    'bankName',
    'jobType',
    'startDate',
    'endDate',
    'phoneNumber',
    'remark',
  ]

  for (const field of fieldsToUpdate) {
    if (field in input) {
      updateData[field] = emptyStringToNull((input as any)[field])
    }
  }

  updateData.updatedAt = nowTimestamp()

  try {
    const updated = await db
      .update(personnel)
      .set(updateData)
      .where(eq(personnel.id, id))
      .returning()
      .get()

    return updated ? toPersonnelSummary(updated) : null
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed') && error?.message?.includes('id_card_number')) {
      throw new Error('身份证号码已存在')
    }
    throw error
  }
}

export async function deletePersonnel(id: number): Promise<boolean> {
  const db = getDb()

  const existing = await db
    .select()
    .from(personnel)
    .where(eq(personnel.id, id))
    .get()
  if (!existing) {
    return false
  }

  const affectedSheets = await db
    .selectDistinct({ payrollSheetId: payrollRecord.payrollSheetId })
    .from(payrollRecord)
    .where(eq(payrollRecord.personnelId, id))
    .all()

  const now = nowTimestamp()

  await db.transaction(async (tx) => {
    if (affectedSheets.length > 0) {
      const sheetIds = affectedSheets.map((s) => s.payrollSheetId)
      await tx
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(inArray(payrollSheet.id, sheetIds))
    }

    await tx.delete(personnel).where(eq(personnel.id, id))
  })

  return true
}

export async function deletePersonnelBatch(ids: number[]): Promise<{ deletedCount: number }> {
  const db = getDb()

  if (ids.length === 0) {
    return { deletedCount: 0 }
  }

  const now = nowTimestamp()

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(personnel)
      .where(inArray(personnel.id, ids))
      .all()

    if (existing.length === 0) {
      return { deletedCount: 0 }
    }

    const affectedSheets = await tx
      .selectDistinct({ payrollSheetId: payrollRecord.payrollSheetId })
      .from(payrollRecord)
      .where(inArray(payrollRecord.personnelId, ids))
      .all()

    if (affectedSheets.length > 0) {
      const sheetIds = affectedSheets.map((s) => s.payrollSheetId)
      await tx
        .update(payrollSheet)
        .set({ updatedAt: now })
        .where(inArray(payrollSheet.id, sheetIds))
    }

    const deleteResult = await tx
      .delete(personnel)
      .where(inArray(personnel.id, ids))
      .run()

    return { deletedCount: deleteResult.changes }
  })

  return result
}

export async function reorderPersonnelByIds(orderedIds: number[]): Promise<void> {
  const db = getDb()

  if (orderedIds.length === 0) {
    return
  }

  const now = nowTimestamp()

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(personnel)
        .set({ sortIndex: index + 1, updatedAt: now })
        .where(eq(personnel.id, id))
    }
  })
}
