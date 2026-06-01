import { Plus, Trash2 } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { MessageBar } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

function preloadPersonnelPickerDialog() {
  void import("@/features/manage-personnel/ui/personnel-picker-dialog")
}

export function PayrollRecordToolbar() {
  const {
    errorMessage,
    isRemovingPersonnel,
    notice,
    removeSelectedPersonnelFromSheet,
    selectedPersonnelIds,
    selectedSheetId,
    setPersonnelDialogOpen,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      errorMessage: state.errorMessage,
      isRemovingPersonnel: state.isRemovingPersonnel,
      notice: state.notice,
      removeSelectedPersonnelFromSheet: state.removeSelectedPersonnelFromSheet,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
    })),
  )

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Records</p>
          <p className="text-sm text-muted-foreground">当前选中 {selectedPersonnelIds.length} 人</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="px-4"
            disabled={selectedSheetId === null}
            onClick={() =>
              startTransition(() => {
                preloadPersonnelPickerDialog()
                setPersonnelDialogOpen(true)
              })
            }
            onFocus={preloadPersonnelPickerDialog}
            onMouseEnter={preloadPersonnelPickerDialog}
          >
            <Plus className="size-4" />
            添加人员
          </Button>

          <Button
            variant="outline"
            className="px-4"
            disabled={
              selectedSheetId === null ||
              selectedPersonnelIds.length === 0 ||
              isRemovingPersonnel
            }
            onClick={() => {
              void removeSelectedPersonnelFromSheet()
            }}
          >
            <Trash2 className="size-4" />
            移除选中
          </Button>
        </div>
      </div>

      {errorMessage ? <MessageBar variant="error">{errorMessage}</MessageBar> : null}
      {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}
    </div>
  )
}
