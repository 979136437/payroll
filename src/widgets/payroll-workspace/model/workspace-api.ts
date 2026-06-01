import {
  createPersonnel,
  deletePersonnel,
  listPersonnel,
  updatePersonnel,
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
  deletePersonnel,
  getPayrollSheetDetail,
  listPayrollSheets,
  listPersonnel,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
  updatePersonnel,
}
