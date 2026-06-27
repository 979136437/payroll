export interface Personnel {
  id: number
  name: string
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

export interface PersonnelImportResult {
  createdCount: number
  updatedCount: number
  skippedCount: number
  errors: string[]
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
  netPay: number
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
