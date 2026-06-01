import { useEffect } from "react"

import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollWorkspaceDialogs } from "@/widgets/payroll-workspace/ui/payroll-workspace-dialogs"
import { PayrollWorkspaceShell } from "@/widgets/payroll-workspace/ui/payroll-workspace-shell"

export function PayrollWorkspaceWidget() {
  const initializeWorkspace = usePayrollWorkspaceStore(
    (state) => state.initializeWorkspace,
  )

  useEffect(() => {
    void initializeWorkspace()
  }, [initializeWorkspace])

  return (
    <>
      <PayrollWorkspaceShell />
      <PayrollWorkspaceDialogs />
    </>
  )
}
