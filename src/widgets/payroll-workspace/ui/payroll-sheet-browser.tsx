import { startTransition, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { EmptyPanel } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollSheetList } from "@/widgets/payroll-workspace/ui/payroll-sheet-list"

export function PayrollSheetBrowser() {
  const {
    deletePayrollSheet,
    isDeletingSheet,
    openSheetDetail,
    setCreateSheetOpen,
    sheets,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      deletePayrollSheet: state.deletePayrollSheet,
      isDeletingSheet: state.isDeletingSheet,
      openSheetDetail: state.openSheetDetail,
      setCreateSheetOpen: state.setCreateSheetOpen,
      sheets: state.sheets,
    })),
  )
  const [pendingDeleteSheetId, setPendingDeleteSheetId] = useState<number | null>(null)

  const pendingDeleteSheet =
    sheets.find((sheet) => sheet.id === pendingDeleteSheetId) ?? null

  if (sheets.length === 0) {
    return (
      <EmptyPanel
        actionLabel="新建工资表"
        description="先创建一张工资表，再进入工资记录编辑工作台。"
        onAction={() => setCreateSheetOpen(true)}
        title="还没有工资表"
      />
    )
  }

  return (
    <>
      <div className="rounded-[1.5rem] border border-border/70 bg-muted/55 p-3 shadow-inner md:p-4">
        <PayrollSheetList
          deletingSheetId={pendingDeleteSheetId}
          isDeletingSheet={isDeletingSheet}
          isLoading={false}
          mode="card"
          onCreate={() => setCreateSheetOpen(true)}
          onDelete={(sheet) => setPendingDeleteSheetId(sheet.id)}
          onSelect={(sheetId) =>
            startTransition(() => {
              void openSheetDetail(sheetId)
            })
          }
          selectedSheetId={null}
          sheets={sheets}
        />
      </div>

      {pendingDeleteSheet ? (
        <ConfirmDialog
          confirmLabel="确认删除工资表"
          description={`删除 ${pendingDeleteSheet.name} 后，会同时删除该工资表下的全部工资记录。`}
          isBusy={isDeletingSheet}
          onConfirm={async () => {
            const didDelete = await deletePayrollSheet(pendingDeleteSheet.id)
            if (didDelete) {
              setPendingDeleteSheetId(null)
            }
          }}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeleteSheetId(null)
            }
          }}
          open
          title="确认删除工资表"
          warningText="删除后将立即生效，工资记录不会保留，但不会删除人员档案。"
        />
      ) : null}
    </>
  )
}
