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
  const selectedPersonnelIdSet = useMemo(
    () => new Set(selectedPersonnelIds),
    [selectedPersonnelIds],
  )
  const savingRecordIdSet = useMemo(
    () => new Set(savingRecordIds),
    [savingRecordIds],
  )
  const pickerSelectionSet = useMemo(
    () => new Set(pickerSelection),
    [pickerSelection],
  )

  const isWorkspaceLoading = isBootstrapping
  const isBusy =
    isCreatingSheet ||
    isCreatingPersonnel ||
    isAddingPersonnel ||
    isRemovingPersonnel

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(61,123,158,0.22),transparent_32%),linear-gradient(120deg,rgba(247,242,230,0.86),transparent_55%)] px-4 py-5 text-slate-900 md:px-6">
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
                    {selectedSheetSummary?.name ?? "工资录入"}
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-6">
                    {selectedSheetSummary
                      ? "在当前工资表里维护人员名单，并逐人录入实发工资。"
                      : "创建工资表后，可以从往期导入人员，或者从人员库多选加入。"}
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
                    从人员库添加
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full px-4"
                    disabled={
                      selectedSheetId === null || selectedPersonnelIds.length === 0
                    }
                    onClick={() => void removeSelectedPersonnelFromSheet()}
                  >
                    批量移除
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
                <LoadingState label="正在读取工资详情..." />
              ) : !selectedSheetSummary ? (
                <EmptyPanel
                  title="工资工作台已就绪"
                  description="创建一张工资表后，你就可以从往期导入人员，或者从人员库多选加入，然后直接录入实发工资。"
                  actionLabel="创建工资表"
                  onAction={() => setCreateSheetOpen(true)}
                />
              ) : isDetailLoading ? (
                <LoadingState label="正在读取当前工资表..." />
              ) : sheetDetail?.records.length ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <SummaryTile
                      icon={<UsersRound className="size-4" />}
                      label="当前人数"
                      value={`${sheetDetail.records.length} 人`}
                    />
                    <SummaryTile
                      icon={<CircleDollarSign className="size-4" />}
                      label="工资合计"
                      value={`¥ ${formatMoney(
                        sheetDetail.records.reduce(
                          (sum, record) => sum + record.netPay,
                          0,
                        ),
                      )}`}
                    />
                    <SummaryTile
                      icon={<BadgePlus className="size-4" />}
                      label="批量选择"
                      value={`${selectedPersonnelIds.length} 人`}
                    />
                  </div>

                  <PayrollRecordTable
                    drafts={salaryDrafts}
                    onDraftChange={updateSalaryDraft}
                    onSave={saveNetPay}
                    onToggleSelection={toggleSelectedPersonnel}
                    records={sheetDetail.records}
                    savingRecordIdSet={savingRecordIdSet}
                    selectedPersonnelIdSet={selectedPersonnelIdSet}
                  />
                </>
              ) : (
                <EmptyPanel
                  title="这张工资表还没有人员"
                  description="从人员库多选加入，或新建人员后直接加入到当前工资表。"
                  actionLabel="从人员库添加"
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
        pickerSelectionSet={pickerSelectionSet}
      />
    </main>
  )
}
