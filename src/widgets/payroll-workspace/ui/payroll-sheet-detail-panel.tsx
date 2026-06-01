import { ArrowLeft, BadgePlus, CircleDollarSign, UsersRound } from "lucide-react"
import { startTransition, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { PayrollRecordTable } from "@/features/edit-payroll-record/ui/payroll-record-table"
import { SummaryTile } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollRecordToolbar } from "@/widgets/payroll-workspace/ui/payroll-record-toolbar"
import { PayrollSheetList } from "@/widgets/payroll-workspace/ui/payroll-sheet-list"

function preloadCreatePayrollSheetDialog() {
  void import("@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog")
}

export function PayrollSheetDetailPanel() {
  const {
    isCreatingSheet,
    openSheetDetail,
    salaryDrafts,
    saveNetPay,
    savingRecordIds,
    selectedPersonnelIds,
    selectedSheetId,
    setCreateSheetOpen,
    sheetDetail,
    sheets,
    showOverview,
    toggleSelectedPersonnel,
    updateSalaryDraft,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      isCreatingSheet: state.isCreatingSheet,
      openSheetDetail: state.openSheetDetail,
      salaryDrafts: state.salaryDrafts,
      saveNetPay: state.saveNetPay,
      savingRecordIds: state.savingRecordIds,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setCreateSheetOpen: state.setCreateSheetOpen,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
      showOverview: state.showOverview,
      toggleSelectedPersonnel: state.toggleSelectedPersonnel,
      updateSalaryDraft: state.updateSalaryDraft,
    })),
  )

  const selectedSheetSummary =
    sheets.find((sheet) => sheet.id === selectedSheetId) ?? sheetDetail?.sheet ?? null
  const records = sheetDetail?.records ?? []
  const savingRecordIdSet = useMemo(
    () => new Set(savingRecordIds),
    [savingRecordIds],
  )
  const selectedPersonnelIdSet = useMemo(
    () => new Set(selectedPersonnelIds),
    [selectedPersonnelIds],
  )

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="px-4" onClick={showOverview}>
              <ArrowLeft className="size-4" />
              返回总览
            </Button>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Payroll Detail</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {selectedSheetSummary?.name ?? "工资表详情"}
              </h1>
              <p className="text-sm leading-7 text-muted-foreground">
                在双栏工作台里维护工资表导航、人员记录和实发工资。
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile
              icon={<UsersRound className="size-4" />}
              label="人员记录"
              value={`${records.length}`}
            />
            <SummaryTile
              icon={<BadgePlus className="size-4" />}
              label="当前选中"
              value={`${selectedPersonnelIds.length}`}
            />
            <SummaryTile
              icon={<CircleDollarSign className="size-4" />}
              label="保存中"
              value={`${savingRecordIds.length}`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <aside className="w-full xl:max-w-sm">
          <PayrollSheetList
            isLoading={isCreatingSheet}
            mode="embedded"
            onCreate={() => {
              preloadCreatePayrollSheetDialog()
              setCreateSheetOpen(true)
            }}
            onCreateIntent={preloadCreatePayrollSheetDialog}
            onSelect={(sheetId) =>
              startTransition(() => {
                void openSheetDetail(sheetId)
              })
            }
            selectedSheetId={selectedSheetId}
            sheets={sheets}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PayrollRecordToolbar />
          <PayrollRecordTable
            drafts={salaryDrafts}
            onDraftChange={updateSalaryDraft}
            onSave={saveNetPay}
            onToggleSelection={toggleSelectedPersonnel}
            records={records}
            savingRecordIdSet={savingRecordIdSet}
            selectedPersonnelIdSet={selectedPersonnelIdSet}
          />
        </div>
      </div>
    </section>
  )
}
