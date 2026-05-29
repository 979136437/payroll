import { useEffect, useMemo } from "react"
import { BadgePlus, CircleDollarSign, UsersRound } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { CreatePayrollSheetDialog } from "@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog"
import { PayrollRecordTable } from "@/features/edit-payroll-record/ui/payroll-record-table"
import { PersonnelPickerDialog } from "@/features/manage-personnel/ui/personnel-picker-dialog"
import { formatMoney } from "@/shared/lib/formatters"
import {
  EmptyPanel,
  LoadingState,
  MessageBar,
  SummaryTile,
} from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollSheetList } from "@/widgets/payroll-workspace/ui/payroll-sheet-list"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const COPY = {
  addFromPersonnel: "\u4ece\u4eba\u5458\u5e93\u6dfb\u52a0",
  batchRemove: "\u6279\u91cf\u79fb\u9664",
  currentCount: "\u5f53\u524d\u4eba\u6570",
  createSheet: "\u521b\u5efa\u5de5\u8d44\u8868",
  emptySheetDescription:
    "\u4ece\u4eba\u5458\u5e93\u591a\u9009\u52a0\u5165\uff0c\u6216\u65b0\u5efa\u4eba\u5458\u540e\u76f4\u63a5\u52a0\u5165\u5230\u5f53\u524d\u5de5\u8d44\u8868\u3002",
  emptySheetTitle: "\u8fd9\u5f20\u5de5\u8d44\u8868\u8fd8\u6ca1\u6709\u4eba\u5458",
  loadingDetail: "\u6b63\u5728\u8bfb\u53d6\u5f53\u524d\u5de5\u8d44\u8868...",
  loadingWorkspace: "\u6b63\u5728\u8bfb\u53d6\u5de5\u8d44\u8be6\u60c5...",
  salaryEntry: "\u5de5\u8d44\u5f55\u5165",
  selectionCount: "\u6279\u91cf\u9009\u62e9",
  sheetDescription:
    "\u5728\u5f53\u524d\u5de5\u8d44\u8868\u91cc\u7ef4\u62a4\u4eba\u5458\u540d\u5355\uff0c\u5e76\u9010\u4eba\u5f55\u5165\u5b9e\u53d1\u5de5\u8d44\u3002",
  totalPay: "\u5de5\u8d44\u5408\u8ba1",
  workspaceEmptyDescription:
    "\u521b\u5efa\u4e00\u5f20\u5de5\u8d44\u8868\u540e\uff0c\u4f60\u5c31\u53ef\u4ee5\u4ece\u5f80\u671f\u5bfc\u5165\u4eba\u5458\uff0c\u6216\u8005\u4ece\u4eba\u5458\u5e93\u591a\u9009\u52a0\u5165\uff0c\u7136\u540e\u76f4\u63a5\u5f55\u5165\u5b9e\u53d1\u5de5\u8d44\u3002",
  workspaceEmptyTitle: "\u5de5\u8d44\u5de5\u4f5c\u53f0\u5df2\u5c31\u7eea",
  workspacePrompt:
    "\u521b\u5efa\u5de5\u8d44\u8868\u540e\uff0c\u53ef\u4ee5\u4ece\u5f80\u671f\u5bfc\u5165\u4eba\u5458\uff0c\u6216\u8005\u4ece\u4eba\u5458\u5e93\u591a\u9009\u52a0\u5165\u3002",
  yuanPrefix: "\u00a5",
}

export function PayrollWorkspaceWidget() {
  const {
    addSelectedPersonnelToSheet,
    clearFeedback,
    createPersonnelRecord,
    createSheet,
    errorMessage,
    initializeWorkspace,
    isAddingPersonnel,
    isBootstrapping,
    isCreateSheetOpen,
    isCreatingPersonnel,
    isCreatingSheet,
    isDetailLoading,
    isPersonnelDialogOpen,
    isRemovingPersonnel,
    notice,
    personnel,
    pickerSelection,
    removeSelectedPersonnelFromSheet,
    salaryDrafts,
    saveNetPay,
    savingRecordIds,
    selectedPersonnelIds,
    selectedSheetId,
    selectSheet,
    setCreateSheetOpen,
    setPersonnelDialogOpen,
    sheetDetail,
    sheets,
    togglePickerSelection,
    toggleSelectedPersonnel,
    updateSalaryDraft,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      addSelectedPersonnelToSheet: state.addSelectedPersonnelToSheet,
      clearFeedback: state.clearFeedback,
      createPersonnelRecord: state.createPersonnelRecord,
      createSheet: state.createSheet,
      errorMessage: state.errorMessage,
      initializeWorkspace: state.initializeWorkspace,
      isAddingPersonnel: state.isAddingPersonnel,
      isBootstrapping: state.isBootstrapping,
      isCreateSheetOpen: state.isCreateSheetOpen,
      isCreatingPersonnel: state.isCreatingPersonnel,
      isCreatingSheet: state.isCreatingSheet,
      isDetailLoading: state.isDetailLoading,
      isPersonnelDialogOpen: state.isPersonnelDialogOpen,
      isRemovingPersonnel: state.isRemovingPersonnel,
      notice: state.notice,
      personnel: state.personnel,
      pickerSelection: state.pickerSelection,
      removeSelectedPersonnelFromSheet: state.removeSelectedPersonnelFromSheet,
      salaryDrafts: state.salaryDrafts,
      saveNetPay: state.saveNetPay,
      savingRecordIds: state.savingRecordIds,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      selectSheet: state.selectSheet,
      setCreateSheetOpen: state.setCreateSheetOpen,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
      togglePickerSelection: state.togglePickerSelection,
      toggleSelectedPersonnel: state.toggleSelectedPersonnel,
      updateSalaryDraft: state.updateSalaryDraft,
    })),
  )

  useEffect(() => {
    void initializeWorkspace()
  }, [initializeWorkspace])

  const selectedSheetSummary =
    sheets.find((sheet) => sheet.id === selectedSheetId) ?? null
  const currentSheetPersonIds = useMemo(
    () =>
      new Set((sheetDetail?.records ?? []).map((record) => record.personnelId)),
    [sheetDetail],
  )

  const isWorkspaceLoading = isBootstrapping
  const isBusy =
    isCreatingSheet ||
    isCreatingPersonnel ||
    isAddingPersonnel ||
    isRemovingPersonnel

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,123,158,0.22),_transparent_32%),linear-gradient(120deg,_rgba(247,242,230,0.86),_transparent_55%)] px-4 py-5 text-slate-900 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl gap-4">
        <section className="flex w-full max-w-sm flex-col gap-4">
          <PayrollSheetList
            isLoading={isWorkspaceLoading}
            onCreate={() => setCreateSheetOpen(true)}
            onSelect={(sheetId) => {
              clearFeedback()
              void selectSheet(sheetId)
            }}
            selectedSheetId={selectedSheetId}
            sheets={sheets}
          />
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="flex-1 border-white/60 bg-white/80 shadow-xl shadow-slate-900/10 backdrop-blur">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight">
                    {selectedSheetSummary?.name ?? COPY.salaryEntry}
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-6">
                    {selectedSheetSummary
                      ? COPY.sheetDescription
                      : COPY.workspacePrompt}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full px-4"
                    disabled={selectedSheetId === null}
                    onClick={() => setPersonnelDialogOpen(true)}
                  >
                    <UsersRound className="size-4" />
                    {COPY.addFromPersonnel}
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full px-4"
                    disabled={
                      selectedSheetId === null || selectedPersonnelIds.length === 0
                    }
                    onClick={() => void removeSelectedPersonnelFromSheet()}
                  >
                    {COPY.batchRemove}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-4 px-4 pb-4">
              {errorMessage ? (
                <MessageBar variant="error">{errorMessage}</MessageBar>
              ) : null}
              {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}

              {isWorkspaceLoading ? (
                <LoadingState label={COPY.loadingWorkspace} />
              ) : !selectedSheetSummary ? (
                <EmptyPanel
                  title={COPY.workspaceEmptyTitle}
                  description={COPY.workspaceEmptyDescription}
                  actionLabel={COPY.createSheet}
                  onAction={() => setCreateSheetOpen(true)}
                />
              ) : isDetailLoading ? (
                <LoadingState label={COPY.loadingDetail} />
              ) : sheetDetail?.records.length ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <SummaryTile
                      icon={<UsersRound className="size-4" />}
                      label={COPY.currentCount}
                      value={`${sheetDetail.records.length} \u4eba`}
                    />
                    <SummaryTile
                      icon={<CircleDollarSign className="size-4" />}
                      label={COPY.totalPay}
                      value={`${COPY.yuanPrefix} ${formatMoney(
                        sheetDetail.records.reduce(
                          (sum, record) => sum + record.netPay,
                          0,
                        ),
                      )}`}
                    />
                    <SummaryTile
                      icon={<BadgePlus className="size-4" />}
                      label={COPY.selectionCount}
                      value={`${selectedPersonnelIds.length} \u4eba`}
                    />
                  </div>

                  <PayrollRecordTable
                    drafts={salaryDrafts}
                    onDraftChange={updateSalaryDraft}
                    onSave={saveNetPay}
                    onToggleSelection={toggleSelectedPersonnel}
                    records={sheetDetail.records}
                    savingRecordIds={savingRecordIds}
                    selectedPersonnelIds={selectedPersonnelIds}
                  />
                </>
              ) : (
                <EmptyPanel
                  title={COPY.emptySheetTitle}
                  description={COPY.emptySheetDescription}
                  actionLabel={COPY.addFromPersonnel}
                  onAction={() => setPersonnelDialogOpen(true)}
                />
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <CreatePayrollSheetDialog
        isBusy={isBusy}
        onOpenChange={setCreateSheetOpen}
        onSubmit={async (values) =>
          createSheet({
            name: values.name,
            sourceSheetId: values.sourceSheetId
              ? Number(values.sourceSheetId)
              : null,
          })
        }
        open={isCreateSheetOpen}
        sheets={sheets}
      />

      <PersonnelPickerDialog
        currentSheetPersonIds={currentSheetPersonIds}
        isBusy={isBusy || selectedSheetId === null}
        onAddSelected={addSelectedPersonnelToSheet}
        onCreatePersonnel={async (values) =>
          createPersonnelRecord({
            name: values.name,
            jobType: values.jobType || null,
            phoneNumber: values.phoneNumber || null,
          })
        }
        onOpenChange={setPersonnelDialogOpen}
        onToggleSelection={togglePickerSelection}
        open={isPersonnelDialogOpen}
        personnel={personnel}
        pickerSelection={pickerSelection}
      />
    </main>
  )
}
