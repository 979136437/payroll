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
