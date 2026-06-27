import Database from 'better-sqlite3'

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

export interface UpdatePersonnelInput {
  name?: string
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

export interface DeletePersonnelBatchResult {
  deletedCount: number
}

export interface DeletePayrollSheetResult {
  deleted: boolean
}

function normalizeStr(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function nowTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString()
}

function rowToPersonnel(row: any): PersonnelSummary {
  return {
    id: row.id,
    name: row.name,
    sortIndex: row.sort_index,
    gender: row.gender,
    ethnicity: row.ethnicity,
    nativePlace: row.native_place,
    idCardNumber: row.id_card_number,
    payrollCardNumber: row.payroll_card_number,
    bankName: row.bank_name,
    jobType: row.job_type,
    startDate: row.start_date,
    endDate: row.end_date,
    phoneNumber: row.phone_number,
    remark: row.remark,
    updatedAt: row.updated_at,
  }
}

function rowToPayrollSheetSummary(row: any): PayrollSheetSummary {
  return {
    id: row.id,
    name: row.name,
    personnelCount: row.personnel_count ?? 0,
    totalNetPay: row.total_net_pay ?? 0,
    updatedAt: row.updated_at,
  }
}

function rowToPayrollSheetRecordRow(row: any): PayrollSheetRecordRow {
  return {
    recordId: row.record_id,
    personnelId: row.personnel_id,
    name: row.name,
    idCardNumber: row.id_card_number,
    payrollCardNumber: row.payroll_card_number,
    bankName: row.bank_name,
    exportWeight: row.export_weight,
    attendanceDays: row.attendance_days,
    wageStandard: row.wage_standard,
    grossPay: row.gross_pay,
    deductionAmount: row.deduction_amount,
    phoneNumber: row.phone_number,
    netPay: row.net_pay,
    payeeSignature: row.payee_signature,
    remark: row.remark,
  }
}

export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      gender TEXT,
      ethnicity TEXT,
      native_place TEXT,
      id_card_number TEXT UNIQUE,
      payroll_card_number TEXT,
      bank_name TEXT,
      job_type TEXT,
      start_date TEXT,
      end_date TEXT,
      phone_number TEXT,
      remark TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_sheet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_sheet_id INTEGER NOT NULL,
      personnel_id INTEGER NOT NULL,
      export_weight REAL,
      attendance_days REAL,
      wage_standard REAL,
      gross_pay REAL,
      deduction_amount REAL,
      net_pay REAL,
      payee_signature TEXT,
      remark TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(payroll_sheet_id, personnel_id),
      FOREIGN KEY (payroll_sheet_id) REFERENCES payroll_sheet(id) ON DELETE CASCADE,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );
  `)

  return db
}

export function listPersonnel(db: Database.Database): PersonnelSummary[] {
  const rows = db.prepare(`
    SELECT * FROM personnel
    ORDER BY sort_index ASC, id ASC
  `).all()
  return rows.map(rowToPersonnel)
}

export function createPersonnel(db: Database.Database, input: CreatePersonnelInput): PersonnelSummary {
  const name = input.name.trim()
  const now = nowTimestamp()

  const maxSortIndexRow = db.prepare('SELECT COALESCE(MAX(sort_index), -1) as max_sort FROM personnel').get() as any
  const sortIndex = maxSortIndexRow.max_sort + 1

  const stmt = db.prepare(`
    INSERT INTO personnel (
      name, sort_index, gender, ethnicity, native_place, id_card_number,
      payroll_card_number, bank_name, job_type, start_date, end_date,
      phone_number, remark, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    name,
    sortIndex,
    normalizeStr(input.gender),
    normalizeStr(input.ethnicity),
    normalizeStr(input.nativePlace),
    normalizeStr(input.idCardNumber),
    normalizeStr(input.payrollCardNumber),
    normalizeStr(input.bankName),
    normalizeStr(input.jobType),
    normalizeStr(input.startDate),
    normalizeStr(input.endDate),
    normalizeStr(input.phoneNumber),
    normalizeStr(input.remark),
    now,
  )

  const row = db.prepare('SELECT * FROM personnel WHERE id = ?').get(result.lastInsertRowid)
  return rowToPersonnel(row)
}

export function updatePersonnel(db: Database.Database, id: number, input: UpdatePersonnelInput): PersonnelSummary | null {
  const existing = db.prepare('SELECT * FROM personnel WHERE id = ?').get(id)
  if (!existing) return null

  const now = nowTimestamp()
  const name = input.name !== undefined ? input.name.trim() : (existing as any).name

  const stmt = db.prepare(`
    UPDATE personnel SET
      name = ?,
      gender = ?,
      ethnicity = ?,
      native_place = ?,
      id_card_number = ?,
      payroll_card_number = ?,
      bank_name = ?,
      job_type = ?,
      start_date = ?,
      end_date = ?,
      phone_number = ?,
      remark = ?,
      updated_at = ?
    WHERE id = ?
  `)

  stmt.run(
    name,
    input.gender !== undefined ? normalizeStr(input.gender) : (existing as any).gender,
    input.ethnicity !== undefined ? normalizeStr(input.ethnicity) : (existing as any).ethnicity,
    input.nativePlace !== undefined ? normalizeStr(input.nativePlace) : (existing as any).native_place,
    input.idCardNumber !== undefined ? normalizeStr(input.idCardNumber) : (existing as any).id_card_number,
    input.payrollCardNumber !== undefined ? normalizeStr(input.payrollCardNumber) : (existing as any).payroll_card_number,
    input.bankName !== undefined ? normalizeStr(input.bankName) : (existing as any).bank_name,
    input.jobType !== undefined ? normalizeStr(input.jobType) : (existing as any).job_type,
    input.startDate !== undefined ? normalizeStr(input.startDate) : (existing as any).start_date,
    input.endDate !== undefined ? normalizeStr(input.endDate) : (existing as any).end_date,
    input.phoneNumber !== undefined ? normalizeStr(input.phoneNumber) : (existing as any).phone_number,
    input.remark !== undefined ? normalizeStr(input.remark) : (existing as any).remark,
    now,
    id,
  )

  const row = db.prepare('SELECT * FROM personnel WHERE id = ?').get(id)
  return rowToPersonnel(row)
}

export function deletePersonnel(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM personnel WHERE id = ?').run(id)
  return result.changes > 0
}

export function deletePersonnelBatch(db: Database.Database, ids: number[]): DeletePersonnelBatchResult {
  if (ids.length === 0) return { deletedCount: 0 }

  const placeholders = ids.map(() => '?').join(',')
  const result = db.prepare(`DELETE FROM personnel WHERE id IN (${placeholders})`).run(...ids)
  return { deletedCount: result.changes }
}

export function listPayrollSheets(db: Database.Database): PayrollSheetSummary[] {
  const rows = db.prepare(`
    SELECT 
      ps.id,
      ps.name,
      ps.updated_at,
      COUNT(pr.id) as personnel_count,
      COALESCE(SUM(pr.net_pay), 0) as total_net_pay
    FROM payroll_sheet ps
    LEFT JOIN payroll_record pr ON ps.id = pr.payroll_sheet_id
    GROUP BY ps.id
    ORDER BY ps.updated_at DESC, ps.id DESC
  `).all()
  return rows.map(rowToPayrollSheetSummary)
}

export function createPayrollSheet(db: Database.Database, input: CreatePayrollSheetInput): PayrollSheetSummary {
  const name = input.name.trim()
  const now = nowTimestamp()

  const insertSheet = db.prepare(`
    INSERT INTO payroll_sheet (name, updated_at)
    VALUES (?, ?)
  `)

  const result = db.transaction(() => {
    const res = insertSheet.run(name, now)
    const sheetId = res.lastInsertRowid as number

    if (input.sourceSheetId !== undefined) {
      const sourceRecords = db.prepare(`
        SELECT 
          pr.personnel_id,
          pr.export_weight,
          pr.attendance_days,
          pr.wage_standard,
          pr.gross_pay,
          pr.deduction_amount,
          pr.net_pay,
          pr.payee_signature,
          pr.remark
        FROM payroll_record pr
        WHERE pr.payroll_sheet_id = ?
        ORDER BY pr.id ASC
      `).all(input.sourceSheetId) as any[]

      const insertRecord = db.prepare(`
        INSERT INTO payroll_record (
          payroll_sheet_id, personnel_id, export_weight, attendance_days,
          wage_standard, gross_pay, deduction_amount, net_pay,
          payee_signature, remark, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const rec of sourceRecords) {
        insertRecord.run(
          sheetId,
          rec.personnel_id,
          rec.export_weight,
          rec.attendance_days,
          rec.wage_standard,
          rec.gross_pay,
          rec.deduction_amount,
          rec.net_pay,
          rec.payee_signature,
          rec.remark,
          now,
        )
      }
    }

    return sheetId
  })()

  const row = db.prepare(`
    SELECT 
      ps.id,
      ps.name,
      ps.updated_at,
      COUNT(pr.id) as personnel_count,
      COALESCE(SUM(pr.net_pay), 0) as total_net_pay
    FROM payroll_sheet ps
    LEFT JOIN payroll_record pr ON ps.id = pr.payroll_sheet_id
    WHERE ps.id = ?
    GROUP BY ps.id
  `).get(result)

  return rowToPayrollSheetSummary(row)
}

export function deletePayrollSheet(db: Database.Database, id: number): DeletePayrollSheetResult {
  const result = db.prepare('DELETE FROM payroll_sheet WHERE id = ?').run(id)
  return { deleted: result.changes > 0 }
}

export function getPayrollSheetDetail(db: Database.Database, id: number): PayrollSheetDetail | null {
  const sheetRow = db.prepare(`
    SELECT 
      ps.id,
      ps.name,
      ps.updated_at,
      COUNT(pr.id) as personnel_count,
      COALESCE(SUM(pr.net_pay), 0) as total_net_pay
    FROM payroll_sheet ps
    LEFT JOIN payroll_record pr ON ps.id = pr.payroll_sheet_id
    WHERE ps.id = ?
    GROUP BY ps.id
  `).get(id)

  if (!sheetRow) return null

  const recordRows = db.prepare(`
    SELECT 
      pr.id as record_id,
      pr.personnel_id,
      p.name,
      p.id_card_number,
      p.payroll_card_number,
      p.bank_name,
      pr.export_weight,
      pr.attendance_days,
      pr.wage_standard,
      pr.gross_pay,
      pr.deduction_amount,
      p.phone_number,
      pr.net_pay,
      pr.payee_signature,
      pr.remark
    FROM payroll_record pr
    JOIN personnel p ON pr.personnel_id = p.id
    WHERE pr.payroll_sheet_id = ?
    ORDER BY p.sort_index ASC, p.id ASC
  `).all(id) as any[]

  return {
    sheet: rowToPayrollSheetSummary(sheetRow),
    records: recordRows.map(rowToPayrollSheetRecordRow),
  }
}

export function addPersonnelToSheet(db: Database.Database, sheetId: number, personnelIds: number[]): void {
  if (personnelIds.length === 0) return

  const now = nowTimestamp()
  const sheet = db.prepare('SELECT id FROM payroll_sheet WHERE id = ?').get(sheetId)
  if (!sheet) return

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO payroll_record (
      payroll_sheet_id, personnel_id, export_weight, attendance_days,
      wage_standard, gross_pay, deduction_amount, net_pay,
      payee_signature, remark, updated_at
    ) VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)
  `)

  const updateSheetStmt = db.prepare(`
    UPDATE payroll_sheet SET updated_at = ? WHERE id = ?
  `)

  const tx = db.transaction(() => {
    for (const pid of personnelIds) {
      insertStmt.run(sheetId, pid, now)
    }
    updateSheetStmt.run(now, sheetId)
  })

  tx()
}

export function addPersonnelToSheetWithNetPay(
  db: Database.Database,
  sheetId: number,
  personnelIds: number[],
  netPay: number,
): PayrollSheetDetail | null {
  if (personnelIds.length === 0) return getPayrollSheetDetail(db, sheetId)

  const now = nowTimestamp()
  const sheet = db.prepare('SELECT id FROM payroll_sheet WHERE id = ?').get(sheetId)
  if (!sheet) return null

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO payroll_record (
      payroll_sheet_id, personnel_id, export_weight, attendance_days,
      wage_standard, gross_pay, deduction_amount, net_pay,
      payee_signature, remark, updated_at
    ) VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, NULL, ?)
  `)

  const updateNetPayStmt = db.prepare(`
    UPDATE payroll_record SET net_pay = ?, updated_at = ?
    WHERE payroll_sheet_id = ? AND personnel_id = ?
  `)

  const updateSheetStmt = db.prepare(`
    UPDATE payroll_sheet SET updated_at = ? WHERE id = ?
  `)

  const tx = db.transaction(() => {
    for (const pid of personnelIds) {
      insertStmt.run(sheetId, pid, netPay, now)
      updateNetPayStmt.run(netPay, now, sheetId, pid)
    }
    updateSheetStmt.run(now, sheetId)
  })

  tx()
  return getPayrollSheetDetail(db, sheetId)
}

export function removePersonnelFromSheet(db: Database.Database, sheetId: number, personnelIds: number[]): void {
  if (personnelIds.length === 0) return

  const now = nowTimestamp()
  const placeholders = personnelIds.map(() => '?').join(',')

  const deleteStmt = db.prepare(`
    DELETE FROM payroll_record 
    WHERE payroll_sheet_id = ? AND personnel_id IN (${placeholders})
  `)

  const updateSheetStmt = db.prepare(`
    UPDATE payroll_sheet SET updated_at = ? WHERE id = ?
  `)

  const tx = db.transaction(() => {
    deleteStmt.run(sheetId, ...personnelIds)
    updateSheetStmt.run(now, sheetId)
  })

  tx()
}

export function updatePayrollRecordNetPay(
  db: Database.Database,
  recordId: number,
  netPay: number,
): PayrollSheetRecordRow | null {
  const existing = db.prepare('SELECT * FROM payroll_record WHERE id = ?').get(recordId)
  if (!existing) return null

  const now = nowTimestamp()

  const updateRecordStmt = db.prepare(`
    UPDATE payroll_record SET net_pay = ?, updated_at = ? WHERE id = ?
  `)

  const updateSheetStmt = db.prepare(`
    UPDATE payroll_sheet SET updated_at = ? 
    WHERE id = (SELECT payroll_sheet_id FROM payroll_record WHERE id = ?)
  `)

  const tx = db.transaction(() => {
    updateRecordStmt.run(netPay, now, recordId)
    updateSheetStmt.run(now, recordId)
  })

  tx()

  const row = db.prepare(`
    SELECT 
      pr.id as record_id,
      pr.personnel_id,
      p.name,
      p.id_card_number,
      p.payroll_card_number,
      p.bank_name,
      pr.export_weight,
      pr.attendance_days,
      pr.wage_standard,
      pr.gross_pay,
      pr.deduction_amount,
      p.phone_number,
      pr.net_pay,
      pr.payee_signature,
      pr.remark
    FROM payroll_record pr
    JOIN personnel p ON pr.personnel_id = p.id
    WHERE pr.id = ?
  `).get(recordId) as any

  if (!row) return null
  return rowToPayrollSheetRecordRow(row)
}

export function updatePayrollRecordExportWeight(
  db: Database.Database,
  recordId: number,
  exportWeight: number,
): PayrollSheetRecordRow | null {
  const existing = db.prepare('SELECT * FROM payroll_record WHERE id = ?').get(recordId)
  if (!existing) return null

  const now = nowTimestamp()

  const updateRecordStmt = db.prepare(`
    UPDATE payroll_record SET export_weight = ?, updated_at = ? WHERE id = ?
  `)

  const updateSheetStmt = db.prepare(`
    UPDATE payroll_sheet SET updated_at = ? 
    WHERE id = (SELECT payroll_sheet_id FROM payroll_record WHERE id = ?)
  `)

  const tx = db.transaction(() => {
    updateRecordStmt.run(exportWeight, now, recordId)
    updateSheetStmt.run(now, recordId)
  })

  tx()

  const row = db.prepare(`
    SELECT 
      pr.id as record_id,
      pr.personnel_id,
      p.name,
      p.id_card_number,
      p.payroll_card_number,
      p.bank_name,
      pr.export_weight,
      pr.attendance_days,
      pr.wage_standard,
      pr.gross_pay,
      pr.deduction_amount,
      p.phone_number,
      pr.net_pay,
      pr.payee_signature,
      pr.remark
    FROM payroll_record pr
    JOIN personnel p ON pr.personnel_id = p.id
    WHERE pr.id = ?
  `).get(recordId) as any

  if (!row) return null
  return rowToPayrollSheetRecordRow(row)
}

export function reorderPersonnelByIds(db: Database.Database, orderedIds: number[]): void {
  if (orderedIds.length === 0) return

  const now = nowTimestamp()
  const updateStmt = db.prepare(`
    UPDATE personnel SET sort_index = ?, updated_at = ? WHERE id = ?
  `)

  const tx = db.transaction(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      updateStmt.run(i, now, orderedIds[i])
    }
  })

  tx()
}
