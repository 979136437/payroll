import { CircleDollarSign, Download, Plus, Trash2, UsersRound } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { SummaryTile } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

function preloadPersonnelPickerDialog() {
  void import("@/features/manage-personnel/ui/personnel-picker-dialog")
}

export function PayrollRecordToolbar() {
  const {
    records,
    isRemovingPersonnel,
    isExportingSheet,
    exportCurrentSheet,
    removeSelectedPersonnelFromSheet,
    selectedPersonnelIds,
    selectedSheetId,
    setPersonnelDialogOpen,
    totalNetPay,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      exportCurrentSheet: state.exportCurrentSheet,
      isExportingSheet: state.isExportingSheet,
      isRemovingPersonnel: state.isRemovingPersonnel,
      records: state.sheetDetail?.records ?? [],
      removeSelectedPersonnelFromSheet: state.removeSelectedPersonnelFromSheet,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
      totalNetPay: (state.sheetDetail?.records ?? []).reduce(
        (sum, record) => sum + record.netPay,
        0,
      ),
    })),
  )

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background/92 p-3 shadow-none">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <SummaryTile
            icon={<UsersRound className="size-3.5" />}
            label="人员记录"
            value={`${records.length}`}
          />
          <SummaryTile
            icon={<Plus className="size-3.5" />}
            label="当前选中"
            value={`${selectedPersonnelIds.length}`}
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
            disabled={selectedSheetId === null || isExportingSheet}
            size="sm"
            onClick={() => {
              void exportCurrentSheet()
            }}
          >
            <Download className="size-3.5" />
            导出工资表
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
