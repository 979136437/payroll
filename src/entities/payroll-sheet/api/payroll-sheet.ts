import { invoke } from "@tauri-apps/api/core"

export type ExcelExportResult = {
  filePath: string
}

export type DeletePayrollSheetResult = {
  deleted: boolean
}

export type PayrollSheetSummary = {
  id: number
  name: string
  personnelCount: number
  totalNetPay: number
  updatedAt: string
}

export type CreatePayrollSheetPayload = {
  name: string
  sourceSheetId?: number | null
}

export type PayrollRecord = {
  recordId: number
  personnelId: number
  name: string
  idCardNumber: string | null
  payrollCardNumber: string | null
  phoneNumber: string | null
  netPay: number
}

export type PayrollSheetDetail = {
  sheet: PayrollSheetSummary
  records: PayrollRecord[]
}

export async function listPayrollSheets() {
  return invoke<PayrollSheetSummary[]>("list_payroll_sheets_command")
}

export async function createPayrollSheet(payload: CreatePayrollSheetPayload) {
  return invoke<PayrollSheetSummary>("create_payroll_sheet_command", { payload })
}

export async function getPayrollSheetDetail(sheetId: number) {
  return invoke<PayrollSheetDetail | null>("get_payroll_sheet_detail_command", {
    sheetId,
  })
}

export async function addPersonnelToSheet(
  sheetId: number,
  personnelIds: number[],
) {
  return invoke<void>("add_personnel_to_sheet_command", {
    sheetId,
    personnelIds,
  })
}

export async function removePersonnelFromSheet(
  sheetId: number,
  personnelIds: number[],
) {
  return invoke<void>("remove_personnel_from_sheet_command", {
    sheetId,
    personnelIds,
  })
}

export async function updatePayrollRecordNetPay(
  recordId: number,
  netPay: number,
) {
  return invoke<PayrollRecord | null>("update_payroll_record_net_pay_command", {
    recordId,
    netPay,
  })
}

export async function addPersonnelToSheetWithNetPay(
  sheetId: number,
  personnelIds: number[],
  netPay: number,
) {
  return invoke<PayrollSheetDetail>("add_personnel_to_sheet_with_net_pay_command", {
    netPay,
    personnelIds,
    sheetId,
  })
}

export async function exportPayrollSheetExcel(sheetId: number, savePath: string) {
  return invoke<ExcelExportResult>("export_payroll_sheet_excel_command", {
    savePath,
    sheetId,
  })
}

export async function deletePayrollSheet(sheetId: number) {
  return invoke<DeletePayrollSheetResult>("delete_payroll_sheet_command", {
    sheetId,
  })
}
