export type Personnel = {
  id: number;
  name: string;
  gender: string | null;
  ethnicity: string | null;
  nativePlace: string | null;
  idCardNumber: string | null;
  payrollCardNumber: string | null;
  bankName: string | null;
  jobType: string | null;
  startDate: string | null;
  endDate: string | null;
  phoneNumber: string | null;
  remark: string | null;
};

export type CreatePersonnelInput = {
  name: string;
  gender?: string | null;
  ethnicity?: string | null;
  nativePlace?: string | null;
  idCardNumber?: string | null;
  payrollCardNumber?: string | null;
  bankName?: string | null;
  jobType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  phoneNumber?: string | null;
  remark?: string | null;
};

export type UpdatePersonnelInput = CreatePersonnelInput;

export type DeletePersonnelBatchResult = {
  deletedCount: number;
};

export type PersonnelImportResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
};

export type PayrollSheetSummary = {
  id: number;
  name: string;
  personnelCount: number;
  totalNetPay: number;
  updatedAt: string;
};

export type CreatePayrollSheetInput = {
  name: string;
  sourceSheetId?: number | null;
};

export type PayrollSheetRecordRow = {
  recordId: number;
  personnelId: number;
  name: string;
  idCardNumber: string | null;
  payrollCardNumber: string | null;
  bankName: string | null;
  exportWeight: number | null;
  attendanceDays: number | null;
  wageStandard: number | null;
  grossPay: number | null;
  deductionAmount: number | null;
  phoneNumber: string | null;
  netPay: number;
  payeeSignature: string | null;
  remark: string | null;
};

export type PayrollSheetDetail = {
  sheet: PayrollSheetSummary;
  records: PayrollSheetRecordRow[];
};

export type DeletePayrollSheetResult = {
  deleted: boolean;
};

export type ExcelExportResult = {
  filePath: string;
};
