import { ArrowLeft, BadgePlus, CircleDollarSign, UsersRound } from "lucide-react"
import { startTransition, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { PayrollRecordTable } from "@/features/edit-payroll-record/ui/payroll-record-table"
import { formatMoney } from "@/shared/lib/formatters"
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
    openPersonnelEditDialog,
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
      openPersonnelEditDialog: state.openPersonnelEditDialog,
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
  const totalNetPay = useMemo(
    () => records.reduce((sum, record) => sum + record.netPay, 0),
    [records],
  )
  const savingRecordIdSet = useMemo(() => new Set(savingRecordIds), [savingRecordIds])
  const selectedPersonnelIdSet = useMemo(
    () => new Set(selectedPersonnelIds),
    [selectedPersonnelIds],
  )

  return (
    <section className="flex min-h-full flex-col gap-3">
      <div className="rounded-md border border-border/35 bg-background/45 px-3 py-2.5 shadow-none">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={showOverview}
              >
                <ArrowLeft className="size-3.5" />
                返回总览
              </Button>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">
                Payroll Detail
              </p>
            </div>
            <div className="flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-3">
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
                {selectedSheetSummary?.name ?? "工资表详情"}
              </h1>
              <p className="truncate text-sm text-muted-foreground/65">
                在这里维护当前工资表的人员、证件与实发工资数据。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <SummaryTile
              icon={<UsersRound className="size-3.5" />}
              label="人员记录"
              value={`${records.length}`}
            />
            <SummaryTile
              icon={<BadgePlus className="size-3.5" />}
              label="当前选中"
              value={`${selectedPersonnelIds.length}`}
            />
            <SummaryTile
              icon={<CircleDollarSign className="size-3.5" />}
              label="工资总和"
              value={`¥${formatMoney(totalNetPay)}`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <aside className="w-full xl:max-w-[17rem]">
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

        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/55 p-3 shadow-inner md:p-4">
          <PayrollRecordToolbar />
          <PayrollRecordTable
            drafts={salaryDrafts}
            onDraftChange={updateSalaryDraft}
            onEditPersonnel={openPersonnelEditDialog}
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
