import { getDb, personnel, payrollSheet, payrollRecord } from '../database'
import { eq, and, inArray, desc, asc, sql, count, sum } from 'drizzle-orm'

export interface PayrollSheetSummary {
  id: number
  name: string
  personnelCount: number
  totalNetPay: number
  updatedAt: string
}

export interface CreatePayrollSheetInput {
  name: string
  sourceSheetId?: number
}

export interface PayrollSheetRecordRow {
  recordId: number
  personnelId: number
  name: string
  idCardNumber: string | null
  payrollCardNumber: string | null
  bankName: string | null
  exportWeight: number | null
  attendanceDays: number | null
  wageStandard: number | null
  grossPay: number | null
  deductionAmount: number | null
  phoneNumber: string | null
  netPay: number | null
  payeeSignature: string | null
  remark: string | null
}

export interface PayrollSheetDetail {
  sheet: PayrollSheetSummary
  records: PayrollSheetRecordRow[]
}

export interface DeletePayrollSheetResult {
  deleted: boolean
}

function nowTimestamp(): string {
  return String(Math.floor(Date.now() / 1000))
}

export async function listPayrollSheets(): Promise<PayrollSheetSummary[]> {
  const db = getDb()

  const result = await db
    .select({
      id: payrollSheet.id,
      name: payrollSheet.name,
      updatedAt: payrollSheet.updatedAt,
      personnelCount: count(payrollRecord.id),
      totalNetPay: sql<number>`COALESCE(${sum(payrollRecord.netPay)}, 0)`,
    })
    .from(payrollSheet)
    .leftJoin(payrollRecord, eq(payrollSheet.id, payrollRecord.payrollSheetId))
    .groupBy(payrollSheet.id)
    .orderBy(desc(payrollSheet.updatedAt), desc(payrollSheet.id))

  return result.map((row) => ({
    id: row.id,
    name: row.name,
    personnelCount: row.personnelCount,
    totalNetPay: row.totalNetPay,
    updatedAt: row.updatedAt,
  }))
}

export async function createPayrollSheet(input: CreatePayrollSheetInput): Promise<PayrollSheetSummary> {
  const db = getDb()
  const name = input.name.trim()

  if (!name) {
    throw new Error('工资表名称不能为空')
  }

  const existing = await db.select().from(payrollSheet).where(eq(payrollSheet.name, name)).get()
  if (existing) {
    throw new Error('工资表名称已存在')
  }

  const now = nowTimestamp()

  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(payrollSheet)
      .values({ name, updatedAt: now })
      .returning()
      .get()

    if (input.sourceSheetId !== undefined) {
      const sourceRecords = await tx
        .select({
          personnelId: payrollRecord.personnelId,
          exportWeight: payrollRecord.exportWeight,
          attendanceDays: payrollRecord.attendanceDays,
          wageStandard: payrollRecord.wageStandard,
          grossPay: payrollRecord.grossPay,
          deductionAmount: payrollRecord.deductionAmount,
          netPay: payrollRecord.netPay,
          payeeSignature: payrollRecord.payeeSignature,
          remark: payrollRecord.remark,
        })
        .from(payrollRecord)
        .where(eq(payrollRecord.payrollSheetId, input.sourceSheetId))
        .orderBy(asc(payrollRecord.id))

      if (sourceRecords.length > 0) {
        await tx.insert(payrollRecord).values(
          sourceRecords.map((r) => ({
            payrollSheetId: inserted.id,
            personnelId: r.personnelId,
            netPay: 0,
            updatedAt: now,
          })),
        )
      }
    }

    return inserted
  })

  const summary = await db
    .select({
      id: payrollSheet.id,
      name: payrollSheet.name,
      updatedAt: payrollSheet.updatedAt,
      personnelCount: count(payrollRecord.id),
      totalNetPay: sql<number>`COALESCE(${sum(payrollRecord.netPay)}, 0)`,
    })
    .from(payrollSheet)
    .leftJoin(payrollRecord, eq(payrollSheet.id, payrollRecord.payrollSheetId))
    .where(eq(payrollSheet.id, result.id))
    .groupBy(payrollSheet.id)
    .get()

  if (!summary) {
    throw new Error('创建工资表失败')
  }

  return {
    id: summary.id,
    name: summary.name,
    personnelCount: summary.personnelCount,
    totalNetPay: summary.totalNetPay,
    updatedAt: summary.updatedAt,
  }
}

export async function deletePayrollSheet(id: number): Promise<DeletePayrollSheetResult> {
  const db = getDb()
  const result = await db.delete(payrollSheet).where(eq(payrollSheet.id, id)).run()
  return { deleted: result.changes > 0 }
}

export async function getPayrollSheetDetail(id: number): Promise<PayrollSheetDetail | null> {
  const db = getDb()

  const sheetResult = await db
    .select({
      id: payrollSheet.id,
      name: payrollSheet.name,
      updatedAt: payrollSheet.updatedAt,
      personnelCount: count(payrollRecord.id),
      totalNetPay: sql<number>`COALESCE(${sum(payrollRecord.netPay)}, 0)`,
    })
    .from(payrollSheet)
    .leftJoin(payrollRecord, eq(payrollSheet.id, payrollRecord.payrollSheetId))
    .where(eq(payrollSheet.id, id))
    .groupBy(payrollSheet.id)
    .get()

  if (!sheetResult) {
    return null
  }

  const recordsResult = await db
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
    .innerJoin(personnel, eq(payrollRecord.personnelId, personnel.id))
    .where(eq(payrollRecord.payrollSheetId, id))
    .orderBy(asc(payrollRecord.id))

  return {
    sheet: {
      id: sheetResult.id,
      name: sheetResult.name,
      personnelCount: sheetResult.personnelCount,
      totalNetPay: sheetResult.totalNetPay,
      updatedAt: sheetResult.updatedAt,
    },
    records: recordsResult.map((row) => ({
      recordId: row.recordId,
      personnelId: row.personnelId,
      name: row.name,
      idCardNumber: row.idCardNumber,
      payrollCardNumber: row.payrollCardNumber,
      bankName: row.bankName,
      exportWeight: row.exportWeight,
      attendanceDays: row.attendanceDays,
      wageStandard: row.wageStandard,
      grossPay: row.grossPay,
      deductionAmount: row.deductionAmount,
      phoneNumber: row.phoneNumber,
      netPay: row.netPay,
      payeeSignature: row.payeeSignature,
      remark: row.remark,
    })),
  }
}

export async function addPersonnelToSheet(sheetId: number, personnelIds: number[]): Promise<void> {
  if (personnelIds.length === 0) return

  const db = getDb()
  const now = nowTimestamp()

  const sheet = await db.select().from(payrollSheet).where(eq(payrollSheet.id, sheetId)).get()
  if (!sheet) return

  await db.transaction(async (tx) => {
    await tx
      .insert(payrollRecord)
      .values(
        personnelIds.map((pid) => ({
          payrollSheetId: sheetId,
          personnelId: pid,
          netPay: 0,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing()

    await tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(eq(payrollSheet.id, sheetId))
  })
}

export async function addPersonnelToSheetWithNetPay(
  sheetId: number,
  personnelIds: number[],
  netPay: number,
): Promise<PayrollSheetDetail | null> {
  if (personnelIds.length === 0) {
    return getPayrollSheetDetail(sheetId)
  }

  const db = getDb()
  const now = nowTimestamp()

  const sheet = await db.select().from(payrollSheet).where(eq(payrollSheet.id, sheetId)).get()
  if (!sheet) return null

  await db.transaction(async (tx) => {
    await tx
      .insert(payrollRecord)
      .values(
        personnelIds.map((pid) => ({
          payrollSheetId: sheetId,
          personnelId: pid,
          netPay,
          updatedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [payrollRecord.payrollSheetId, payrollRecord.personnelId],
        set: { netPay, updatedAt: now },
      })

    await tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(eq(payrollSheet.id, sheetId))
  })

  return getPayrollSheetDetail(sheetId)
}

export async function removePersonnelFromSheet(sheetId: number, personnelIds: number[]): Promise<void> {
  if (personnelIds.length === 0) return

  const db = getDb()
  const now = nowTimestamp()

  await db.transaction(async (tx) => {
    await tx
      .delete(payrollRecord)
      .where(
        and(
          eq(payrollRecord.payrollSheetId, sheetId),
          inArray(payrollRecord.personnelId, personnelIds),
        ),
      )

    await tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(eq(payrollSheet.id, sheetId))
  })
}

export async function updatePayrollRecordNetPay(
  recordId: number,
  netPay: number,
): Promise<PayrollSheetRecordRow | null> {
  const db = getDb()

  const existing = await db.select().from(payrollRecord).where(eq(payrollRecord.id, recordId)).get()
  if (!existing) return null

  const now = nowTimestamp()

  await db.transaction(async (tx) => {
    await tx
      .update(payrollRecord)
      .set({ netPay, updatedAt: now })
      .where(eq(payrollRecord.id, recordId))

    await tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(
        eq(
          payrollSheet.id,
          sql`(SELECT ${payrollRecord.payrollSheetId} FROM ${payrollRecord} WHERE ${payrollRecord.id} = ${recordId})`,
        ),
      )
  })

  const row = await db
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
    .innerJoin(personnel, eq(payrollRecord.personnelId, personnel.id))
    .where(eq(payrollRecord.id, recordId))
    .get()

  if (!row) return null

  return {
    recordId: row.recordId,
    personnelId: row.personnelId,
    name: row.name,
    idCardNumber: row.idCardNumber,
    payrollCardNumber: row.payrollCardNumber,
    bankName: row.bankName,
    exportWeight: row.exportWeight,
    attendanceDays: row.attendanceDays,
    wageStandard: row.wageStandard,
    grossPay: row.grossPay,
    deductionAmount: row.deductionAmount,
    phoneNumber: row.phoneNumber,
    netPay: row.netPay,
    payeeSignature: row.payeeSignature,
    remark: row.remark,
  }
}

export async function updatePayrollRecordExportWeight(
  recordId: number,
  exportWeight: number | null,
): Promise<PayrollSheetRecordRow | null> {
  const db = getDb()

  const existing = await db.select().from(payrollRecord).where(eq(payrollRecord.id, recordId)).get()
  if (!existing) return null

  const now = nowTimestamp()

  await db.transaction(async (tx) => {
    await tx
      .update(payrollRecord)
      .set({ exportWeight, updatedAt: now })
      .where(eq(payrollRecord.id, recordId))

    await tx
      .update(payrollSheet)
      .set({ updatedAt: now })
      .where(
        eq(
          payrollSheet.id,
          sql`(SELECT ${payrollRecord.payrollSheetId} FROM ${payrollRecord} WHERE ${payrollRecord.id} = ${recordId})`,
        ),
      )
  })

  const row = await db
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
    .innerJoin(personnel, eq(payrollRecord.personnelId, personnel.id))
    .where(eq(payrollRecord.id, recordId))
    .get()

  if (!row) return null

  return {
    recordId: row.recordId,
    personnelId: row.personnelId,
    name: row.name,
    idCardNumber: row.idCardNumber,
    payrollCardNumber: row.payrollCardNumber,
    bankName: row.bankName,
    exportWeight: row.exportWeight,
    attendanceDays: row.attendanceDays,
    wageStandard: row.wageStandard,
    grossPay: row.grossPay,
    deductionAmount: row.deductionAmount,
    phoneNumber: row.phoneNumber,
    netPay: row.netPay,
    payeeSignature: row.payeeSignature,
    remark: row.remark,
  }
}
