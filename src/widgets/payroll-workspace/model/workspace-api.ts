import {
  exportPersonnelExcel,
  pickExcelExportPath,
  createPersonnel,
  deletePersonnel,
  listPersonnel,
  pickPersonnelImportFile,
  importPersonnelExcel,
  updatePersonnel,
} from "@/entities/personnel/api/personnel"
import {
  addPersonnelToSheet,
  createPayrollSheet,
  exportPayrollSheetExcel,
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
  exportPayrollSheetExcel,
  exportPersonnelExcel,
  getPayrollSheetDetail,
  importPersonnelExcel,
  listPayrollSheets,
  listPersonnel,
  pickExcelExportPath,
  pickPersonnelImportFile,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
  updatePersonnel,
}
