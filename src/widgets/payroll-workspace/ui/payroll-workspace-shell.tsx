import { useShallow } from "zustand/react/shallow"

import { LoadingState } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollOverviewPanel } from "@/widgets/payroll-workspace/ui/payroll-overview-panel"
import { PayrollSheetDetailPanel } from "@/widgets/payroll-workspace/ui/payroll-sheet-detail-panel"

export function PayrollWorkspaceShell() {
  const { currentView, isBootstrapping } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      currentView: state.currentView,
      isBootstrapping: state.isBootstrapping,
    })),
  )

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-7xl">
        {isBootstrapping ? (
          <LoadingState label="正在载入工资工作台..." />
        ) : currentView === "sheet-detail" ? (
          <PayrollSheetDetailPanel />
        ) : (
          <PayrollOverviewPanel />
        )}
      </div>
    </main>
  )
}
