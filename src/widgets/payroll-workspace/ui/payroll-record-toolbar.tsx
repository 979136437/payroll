import { Plus, Trash2 } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

function preloadPersonnelPickerDialog() {
  void import("@/features/manage-personnel/ui/personnel-picker-dialog")
}

export function PayrollRecordToolbar() {
  const {
    isRemovingPersonnel,
    removeSelectedPersonnelFromSheet,
    selectedPersonnelIds,
    selectedSheetId,
    setPersonnelDialogOpen,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      isRemovingPersonnel: state.isRemovingPersonnel,
      removeSelectedPersonnelFromSheet: state.removeSelectedPersonnelFromSheet,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
    })),
  )

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background/92 p-3 shadow-none">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Records
          </p>
          <p className="text-sm text-muted-foreground/80">
            当前选中 {selectedPersonnelIds.length} 人
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="h-8 px-3 text-sm"
            disabled={selectedSheetId === null}
            size="sm"
            onClick={() =>
              startTransition(() => {
                preloadPersonnelPickerDialog()
                setPersonnelDialogOpen(true)
              })
            }
            onFocus={preloadPersonnelPickerDialog}
            onMouseEnter={preloadPersonnelPickerDialog}
          >
            <Plus className="size-3.5" />
            添加人员
          </Button>

          <Button
            variant="outline"
            className="h-8 px-3 text-sm"
            disabled={
              selectedSheetId === null ||
              selectedPersonnelIds.length === 0 ||
              isRemovingPersonnel
            }
            size="sm"
            onClick={() => {
              void removeSelectedPersonnelFromSheet()
            }}
          >
            <Trash2 className="size-3.5" />
            移除选中
          </Button>
        </div>
      </div>
    </div>
  )
}
