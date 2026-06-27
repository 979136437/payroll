import { CircleDollarSign, Download, Plus, Trash2, UsersRound } from "lucide-react"
import { startTransition, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { SummaryTile } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

function preloadPersonnelPickerDialog() {
  void import("@/features/manage-personnel/ui/personnel-picker-dialog")
}

const EMPTY_RECORDS: never[] = []

export function PayrollRecordToolbar() {
  const state = usePayrollWorkspaceStore(
    useShallow((s) => ({
      records: s.sheetDetail?.records ?? EMPTY_RECORDS,
      isRemovingPersonnel: s.isRemovingPersonnel,
      isExportingSheet: s.isExportingSheet,
      exportCurrentSheet: s.exportCurrentSheet,
      removeSelectedPersonnelFromSheet: s.removeSelectedPersonnelFromSheet,
      selectedPersonnelIds: s.selectedPersonnelIds,
      selectedSheetId: s.selectedSheetId,
      setPersonnelDialogOpen: s.setPersonnelDialogOpen,
    })),
  )

  const totalNetPay = useMemo(
    () => state.records.reduce((sum, r) => sum + r.netPay, 0),
    [state.records],
  )

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background/92 p-3 shadow-none">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <SummaryTile
            icon={<UsersRound className="size-3.5" />}
            label="人员记录"
            value={`${state.records.length}`}
          />
          <SummaryTile
            icon={<Plus className="size-3.5" />}
            label="当前选中"
            value={`${state.selectedPersonnelIds.length}`}
          />
          <SummaryTile
            icon={<CircleDollarSign className="size-3.5" />}
            label="工资总和"
            value={`¥${totalNetPay.toFixed(2)}`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="h-8 px-3 text-sm"
            disabled={state.selectedSheetId === null}
            size="sm"
            onClick={() =>
              startTransition(() => {
                preloadPersonnelPickerDialog()
                state.setPersonnelDialogOpen(true)
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
            disabled={state.selectedSheetId === null || state.isExportingSheet}
            size="sm"
            onClick={() => {
              void state.exportCurrentSheet()
            }}
          >
            <Download className="size-3.5" />
            导出工资表
          </Button>

          <Button
            variant="outline"
            className="h-8 px-3 text-sm"
            disabled={
              state.selectedSheetId === null ||
              state.selectedPersonnelIds.length === 0 ||
              state.isRemovingPersonnel
            }
            size="sm"
            onClick={() => {
              void state.removeSelectedPersonnelFromSheet()
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
