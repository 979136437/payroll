import { useShallow } from "zustand/react/shallow"

import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollSheetBrowser } from "@/widgets/payroll-workspace/ui/payroll-sheet-browser"

export function PayrollOverviewPanel() {
  const { personnelCount, selectedSheetName, sheetCount } =
    usePayrollWorkspaceStore(
      useShallow((state) => ({
        personnelCount: state.personnel.length,
        selectedSheetName:
          state.sheets.find((sheet) => sheet.id === state.selectedSheetId)?.name ??
          "尚未进入工资表",
        sheetCount: state.sheets.length,
      })),
    )

  return (
    <section className="flex min-h-full flex-col">
      <PayrollSheetBrowser
        overviewStats={{
          latestSheetName: selectedSheetName,
          personnelCount,
          sheetCount,
        }}
      />
    </section>
  )
}
