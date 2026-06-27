import * as XLSX from 'xlsx'
import type { PersonnelSummary, CreatePersonnelInput, UpdatePersonnelInput } from '../services/personnel.service'
import type { PayrollSheetDetail, PayrollSheetRecordRow } from '../services/payroll.service'

export interface PersonnelImportRow {
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

export interface PersonnelImportResult {
  createdCount: number
  updatedCount: number
  skippedCount: number
  errors: string[]
}

export type ListPersonnelFn = () => PersonnelSummary[]
export type CreatePersonnelFn = (input: CreatePersonnelInput) => PersonnelSummary
export type UpdatePersonnelFn = (id: number, input: UpdatePersonnelInput) => PersonnelSummary | null
export type ReorderPersonnelFn = (orderedIds: number[]) => void
export type GetPayrollSheetDetailFn = (id: number) => PayrollSheetDetail | null

const PERSONNEL_HEADERS = [
  '姓名',
  '性别',
  '民族',
  '籍贯',
  '身份证号码',
  '工资卡号',
  '开户行',
  '工种',
  '上场时间',
  '撤场时间',
  '联系电话',
  '备注'
]

function cleanValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every(cell => {
    const val = cleanValue(cell)
    return val === null
  })
}

function findHeaderRow(rows: unknown[][]): { rowIndex: number; startCol: number } | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i]
    if (!row) continue

    for (let startCol = 0; startCol <= 1; startCol++) {
      let matchCount = 0
      for (let j = 0; j < PERSONNEL_HEADERS.length; j++) {
        const cellValue = cleanValue(row[startCol + j])
        if (cellValue === PERSONNEL_HEADERS[j]) {
          matchCount++
        }
      }
      if (matchCount >= PERSONNEL_HEADERS.length * 0.7) {
        return { rowIndex: i, startCol }
      }
    }
  }
  return null
}

export function parsePersonnelImportRows(buffer: Buffer): PersonnelImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('Excel文件中没有找到工作表')
  }
  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error('无法读取工作表内容')
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' })

  const headerInfo = findHeaderRow(rows)
  if (!headerInfo) {
    throw new Error('未找到表头行，请确保Excel包含正确的人员信息表头')
  }

  const { rowIndex: headerRowIndex, startCol } = headerInfo
  const result: PersonnelImportRow[] = []

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || isEmptyRow(row)) continue

    const getVal = (offset: number): string | null => {
      const idx = startCol + offset
      if (idx >= row.length) return null
      return cleanValue(row[idx])
    }

    const name = getVal(0)
    if (!name) continue

    const parseDate = (val: string | null): string | null => {
      if (!val) return null
      const num = Number(val)
      if (!isNaN(num) && num > 10000) {
        const date = XLSX.SSF.parse_date_code(num)
        if (date) {
          const y = date.y
          const m = String(date.m).padStart(2, '0')
          const d = String(date.d).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
      }
      return val
    }

    const rowData: PersonnelImportRow = {
      name,
      gender: getVal(1),
      ethnicity: getVal(2),
      nativePlace: getVal(3),
      idCardNumber: getVal(4),
      payrollCardNumber: getVal(5),
      bankName: getVal(6),
      jobType: getVal(7),
      startDate: parseDate(getVal(8)),
      endDate: parseDate(getVal(9)),
      phoneNumber: getVal(10),
      remark: getVal(11)
    }

    result.push(rowData)
  }

  return result
}

function toCreateInput(row: PersonnelImportRow): CreatePersonnelInput {
  return {
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
    remark: row.remark ?? null
  }
}

function toUpdateInput(row: PersonnelImportRow): UpdatePersonnelInput {
  return {
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
    remark: row.remark ?? null
  }
}

export function importPersonnelRows(
  rows: PersonnelImportRow[],
  deps: {
    listPersonnel: ListPersonnelFn
    createPersonnel: CreatePersonnelFn
    updatePersonnel: UpdatePersonnelFn
    reorderPersonnelByIds: ReorderPersonnelFn
  }
): PersonnelImportResult {
  const result: PersonnelImportResult = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: []
  }

  const allPersonnel = deps.listPersonnel()
  const idCardMap = new Map<string, PersonnelSummary>()
  for (const p of allPersonnel) {
    if (p.idCardNumber) {
      idCardMap.set(p.idCardNumber, p)
    }
  }

  const importedIds: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      if (!row || !row.name || row.name.trim() === '') {
        result.skippedCount++
        result.errors.push(`第 ${rowNum} 行：姓名为空，已跳过`)
        continue
      }

      const idCard = row.idCardNumber
      let existing: PersonnelSummary | null = null

      if (idCard) {
        existing = idCardMap.get(idCard) || null
      }

      if (existing) {
        deps.updatePersonnel(existing.id, toUpdateInput(row))
        importedIds.push(existing.id)
        result.updatedCount++
      } else {
        const newPersonnel = deps.createPersonnel(toCreateInput(row))
        importedIds.push(newPersonnel.id)
        result.createdCount++
      }
    } catch (error) {
      result.skippedCount++
      const errMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(`第 ${rowNum} 行：${errMsg}`)
    }
  }

  const notImported = allPersonnel.filter(p => !importedIds.includes(p.id))
  const allOrderedIds = [...importedIds, ...notImported.map(p => p.id)]

  deps.reorderPersonnelByIds(allOrderedIds)

  return result
}

function addMergedCell(
  ws: XLSX.WorkSheet,
  s: { r: number; c: number },
  e: { r: number; c: number }
): void {
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s, e })
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

function createPersonnelSheetData(personnelList: PersonnelSummary[]): unknown[][] {
  const data: unknown[][] = []

  data.push(['农民工花名册'])

  const now = new Date()
  const yearMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`
  data.push(['编制单位：', '', '', '', '', '', '', '', '', '', '', '', yearMonth])

  const headers = ['序号', ...PERSONNEL_HEADERS]
  data.push(headers)

  personnelList.forEach((p, index) => {
    data.push([
      index + 1,
      p.name,
      p.gender ?? '',
      p.ethnicity ?? '',
      p.nativePlace ?? '',
      p.idCardNumber ?? '',
      p.payrollCardNumber ?? '',
      p.bankName ?? '',
      p.jobType ?? '',
      p.startDate ?? '',
      p.endDate ?? '',
      p.phoneNumber ?? '',
      p.remark ?? ''
    ])
  })

  return data
}

function buildPersonnelSheet(personnelList: PersonnelSummary[]): XLSX.WorkSheet {
  const data = createPersonnelSheetData(personnelList)
  const ws = XLSX.utils.aoa_to_sheet(data)

  const colCount = 13
  addMergedCell(ws, { r: 0, c: 0 }, { r: 0, c: colCount - 1 })
  addMergedCell(ws, { r: 1, c: 1 }, { r: 1, c: colCount - 2 })

  const widths = [6, 10, 6, 8, 12, 20, 20, 16, 10, 12, 12, 14, 20]
  setColumnWidths(ws, widths)

  return ws
}

export function exportPersonnelExcel(
  listPersonnel: ListPersonnelFn
): Buffer {
  const personnelList = listPersonnel()
  const sorted = [...personnelList].sort((a, b) => a.sortIndex - b.sortIndex)

  const wb = XLSX.utils.book_new()
  const ws = buildPersonnelSheet(sorted)
  XLSX.utils.book_append_sheet(wb, ws, '花名册')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function buildPayrollSheet(sheet: PayrollSheetDetail): XLSX.WorkSheet {
  const data: unknown[][] = []

  data.push(['工资表'])

  data.push(['单位名称：', sheet.sheet.name, '', '', '', '', '', '', '', '', '', ''])

  const headers = [
    '序号',
    '姓名',
    '身份证号',
    '银行卡号',
    '账户银行',
    '出勤天数',
    '工资标准',
    '应发工资',
    '应扣减金额',
    '实发金额',
    '领款人签字',
    '备注'
  ]
  data.push(headers)

  const sortedRecords = [...sheet.records].sort((a, b) => {
    if (a.exportWeight !== null && b.exportWeight !== null) {
      return a.exportWeight - b.exportWeight
    }
    return a.recordId - b.recordId
  })

  let totalAttendance = 0
  let totalGrossPay = 0
  let totalDeductions = 0
  let totalNetPay = 0

  sortedRecords.forEach((r, index) => {
    const attendance = r.attendanceDays ?? 0
    const grossPay = r.grossPay ?? 0
    const deductions = r.deductionAmount ?? 0
    const netPay = r.netPay ?? 0

    totalAttendance += attendance
    totalGrossPay += grossPay
    totalDeductions += deductions
    totalNetPay += netPay

    data.push([
      index + 1,
      r.name,
      r.idCardNumber ?? '',
      r.payrollCardNumber ?? '',
      r.bankName ?? '',
      attendance,
      r.wageStandard ?? '',
      grossPay,
      deductions,
      netPay,
      '',
      r.remark ?? ''
    ])
  })

  data.push([
    '合计',
    '',
    '',
    '',
    '',
    totalAttendance,
    '',
    totalGrossPay,
    totalDeductions,
    totalNetPay,
    '',
    ''
  ])

  const ws = XLSX.utils.aoa_to_sheet(data)

  const colCount = 12
  addMergedCell(ws, { r: 0, c: 0 }, { r: 0, c: colCount - 1 })
  addMergedCell(ws, { r: 1, c: 1 }, { r: 1, c: colCount - 1 })

  const widths = [6, 10, 20, 20, 16, 10, 12, 12, 12, 12, 12, 20]
  setColumnWidths(ws, widths)

  return ws
}

function buildAttendanceSheet(sheet: PayrollSheetDetail): XLSX.WorkSheet {
  const data: unknown[][] = []

  data.push(['农民工考勤表'])

  const yearMonth = sheet.sheet.name
  data.push(['编制单位：', '', '', '', `  月份：${yearMonth}`])

  const dayHeaders = Array.from({ length: 31 }, (_, i) => i + 1)
  const headers = ['序号', '姓名', '身份证号', ...dayHeaders]
  data.push(headers)

  const sortedRecords = [...sheet.records].sort((a, b) => {
    if (a.exportWeight !== null && b.exportWeight !== null) {
      return a.exportWeight - b.exportWeight
    }
    return a.recordId - b.recordId
  })

  sortedRecords.forEach((r, index) => {
    const row: unknown[] = [index + 1, r.name, r.idCardNumber ?? '']
    for (let i = 0; i < 31; i++) {
      row.push('')
    }
    data.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(data)

  const colCount = 3 + 31
  addMergedCell(ws, { r: 0, c: 0 }, { r: 0, c: colCount - 1 })
  addMergedCell(ws, { r: 1, c: 1 }, { r: 1, c: 2 })
  addMergedCell(ws, { r: 1, c: 4 }, { r: 1, c: colCount - 1 })

  const widths: number[] = [6, 10, 20, ...Array(31).fill(4)]
  setColumnWidths(ws, widths)

  return ws
}

export function exportPayrollSheetExcel(
  sheetId: number,
  deps: {
    listPersonnel: ListPersonnelFn
    getPayrollSheetDetail: GetPayrollSheetDetailFn
  }
): Buffer {
  const sheet = deps.getPayrollSheetDetail(sheetId)
  if (!sheet) {
    throw new Error(`工资表 ${sheetId} 不存在`)
  }

  const personnelList = deps.listPersonnel()
  const sortedPersonnel = [...personnelList].sort((a, b) => a.sortIndex - b.sortIndex)

  const wb = XLSX.utils.book_new()

  const rosterSheet = buildPersonnelSheet(sortedPersonnel)
  XLSX.utils.book_append_sheet(wb, rosterSheet, '花名册')

  const payrollSheet = buildPayrollSheet(sheet)
  XLSX.utils.book_append_sheet(wb, payrollSheet, '工资表')

  const attendanceSheet = buildAttendanceSheet(sheet)
  XLSX.utils.book_append_sheet(wb, attendanceSheet, '农民工考勤表')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
