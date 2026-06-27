import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { useToastFeedback } from "@/shared/ui/toast"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollWorkspaceDialogs } from "@/widgets/payroll-workspace/ui/payroll-workspace-dialogs"
import { PayrollWorkspaceShell } from "@/widgets/payroll-workspace/ui/payroll-workspace-shell"

export function PayrollWorkspaceWidget() {
  const { clearFeedback, errorMessage, initializeWorkspace, notice } =
    usePayrollWorkspaceStore(
      useShallow((state) => ({
        clearFeedback: state.clearFeedback,
        errorMessage: state.errorMessage,
        initializeWorkspace: state.initializeWorkspace,
        notice: state.notice,
      })),
    )

  useEffect(() => {
    void initializeWorkspace()
  }, [initializeWorkspace])

  useToastFeedback({
    clearFeedback,
    errorMessage,
    notice,
  })

  return (
    <>
      <PayrollWorkspaceShell />
      <PayrollWorkspaceDialogs />
    </>
  )
}
