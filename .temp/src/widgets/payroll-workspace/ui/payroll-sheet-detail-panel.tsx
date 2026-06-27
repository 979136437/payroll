import { ArrowLeft } from "lucide-react"
import { startTransition, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { PayrollRecordTable } from "@/features/edit-payroll-record/ui/payroll-record-table"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollRecordToolbar } from "@/widgets/payroll-workspace/ui/payroll-record-toolbar"
import { PayrollSheetList } from "@/widgets/payroll-workspace/ui/payroll-sheet-list"

function preloadCreatePayrollSheetDialog() {
  void import("@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog")
}

export function PayrollSheetDetailPanel() {
  const [pendingDeleteSheetId, setPendingDeleteSheetId] = useState<number | null>(null)

  const {
    deletePayrollSheet,
    exportWeightDrafts,
    isCreatingSheet,
    isDeletingSheet,
    openPersonnelEditDialog,
    openSheetDetail,
    salaryDrafts,
    saveExportWeight,
    saveNetPay,
    savingRecordIds,
    selectedPersonnelIds,
    selectedSheetId,
    setCreateSheetOpen,
    sheetDetail,
    sheets,
    showOverview,
    toggleSelectedPersonnel,
    updateExportWeightDraft,
    updateSalaryDraft,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      deletePayrollSheet: state.deletePayrollSheet,
      exportWeightDrafts: state.exportWeightDrafts,
      isCreatingSheet: state.isCreatingSheet,
      isDeletingSheet: state.isDeletingSheet,
      openPersonnelEditDialog: state.openPersonnelEditDialog,
      openSheetDetail: state.openSheetDetail,
      salaryDrafts: state.salaryDrafts,
      saveExportWeight: state.saveExportWeight,
      saveNetPay: state.saveNetPay,
      savingRecordIds: state.savingRecordIds,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setCreateSheetOpen: state.setCreateSheetOpen,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
      showOverview: state.showOverview,
      toggleSelectedPersonnel: state.toggleSelectedPersonnel,
      updateExportWeightDraft: state.updateExportWeightDraft,
      updateSalaryDraft: state.updateSalaryDraft,
    })),
  )

  const selectedSheetSummary =
    sheets.find((sheet) => sheet.id === selectedSheetId) ?? sheetDetail?.sheet ?? null
  const records = sheetDetail?.records ?? []
  const savingRecordIdSet = useMemo(() => new Set(savingRecordIds), [savingRecordIds])
  const selectedPersonnelIdSet = useMemo(
    () => new Set(selectedPersonnelIds),
    [selectedPersonnelIds],
  )
  const pendingDeleteSheet =
    sheets.find((sheet) => sheet.id === pendingDeleteSheetId) ?? null

  const handleDeleteSheetConfirm = async () => {
    if (pendingDeleteSheetId === null) {
      return
    }

    const didDelete = await deletePayrollSheet(pendingDeleteSheetId)
    if (didDelete) {
      setPendingDeleteSheetId(null)
    }
  }

  return (
    <>
      <section className="flex min-h-full flex-col gap-3">
        <div className="rounded-md border border-border/35 bg-background/45 px-3 py-2.5 shadow-none">
          <div className="flex flex-col gap-2">
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
          </div>
        </div>

        <div className="flex gap-3">
          <aside className="w-64 shrink-0">
            <PayrollSheetList
              deletingSheetId={pendingDeleteSheetId}
              isDeletingSheet={isDeletingSheet}
              isLoading={isCreatingSheet}
              mode="embedded"
              onCreate={() => {
                preloadCreatePayrollSheetDialog()
                setCreateSheetOpen(true)
              }}
              onCreateIntent={preloadCreatePayrollSheetDialog}
              onDelete={(sheet) => setPendingDeleteSheetId(sheet.id)}
              onSelect={(sheetId) =>
                startTransition(() => {
                  void openSheetDetail(sheetId)
                })
              }
              selectedSheetId={selectedSheetId}
              sheets={sheets}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border border-border/70 bg-muted/55 p-3 shadow-inner md:p-4">
            <PayrollRecordToolbar />
            <PayrollRecordTable
              drafts={salaryDrafts}
              exportWeightDrafts={exportWeightDrafts}
              onExportWeightDraftChange={updateExportWeightDraft}
              onDraftChange={updateSalaryDraft}
              onEditPersonnel={openPersonnelEditDialog}
              onSaveExportWeight={saveExportWeight}
              onSave={saveNetPay}
              onToggleSelection={toggleSelectedPersonnel}
              records={records}
              savingRecordIdSet={savingRecordIdSet}
              selectedPersonnelIdSet={selectedPersonnelIdSet}
            />
          </div>
        </div>
      </section>

      {pendingDeleteSheet ? (
        <ConfirmDialog
          confirmLabel="确认删除工资表"
          description={`删除 ${pendingDeleteSheet.name} 后，会同时删除该工资表下的全部工资记录。`}
          isBusy={isDeletingSheet}
          onConfirm={handleDeleteSheetConfirm}
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
