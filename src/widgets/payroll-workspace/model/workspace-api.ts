import {
  createPersonnel,
  listPersonnel,
} from "@/entities/personnel/api/personnel"
import {
  addPersonnelToSheet,
  createPayrollSheet,
  getPayrollSheetDetail,
  listPayrollSheets,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
} from "@/entities/payroll-sheet/api/payroll-sheet"

export const payrollWorkspaceApi = {
  addPersonnelToSheet,
  createPayrollSheet,
  createPersonnel,
  getPayrollSheetDetail,
  listPayrollSheets,
  listPersonnel,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
}
