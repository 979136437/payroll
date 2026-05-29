import { lazy, startTransition, Suspense, useEffect, useMemo } from "react"
import { BadgePlus, CircleDollarSign, UsersRound } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import type { CreatePayrollSheetValues } from "@/features/create-payroll-sheet/model/schema"
import { PayrollRecordTable } from "@/features/edit-payroll-record/ui/payroll-record-table"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
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

const CreatePayrollSheetDialog = lazy(async () => {
  const module = await import(
    "@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog"
  )

  return { default: module.CreatePayrollSheetDialog }
})

const PersonnelPickerDialog = lazy(async () => {
  const module = await import(
    "@/features/manage-personnel/ui/personnel-picker-dialog"
  )

  return { default: module.PersonnelPickerDialog }
})

function preloadCreatePayrollSheetDialog() {
  void import("@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog")
}

function preloadPersonnelPickerDialog() {
  void import("@/features/manage-personnel/ui/personnel-picker-dialog")
}

function DialogFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/12 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/92 p-6 shadow-2xl shadow-slate-900/15">
        <LoadingState label="正在加载弹窗..." />
      </div>
    </div>
  )
}

function useWorkspaceActions() {
  return usePayrollWorkspaceStore(
    useShallow((state) => ({
      addSelectedPersonnelToSheet: state.addSelectedPersonnelToSheet,
      clearFeedback: state.clearFeedback,
      createPersonnelRecord: state.createPersonnelRecord,
      createSheet: state.createSheet,
      initializeWorkspace: state.initializeWorkspace,
      removeSelectedPersonnelFromSheet: state.removeSelectedPersonnelFromSheet,
      saveNetPay: state.saveNetPay,
      selectSheet: state.selectSheet,
      setCreateSheetOpen: state.setCreateSheetOpen,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
      togglePickerSelection: state.togglePickerSelection,
      toggleSelectedPersonnel: state.toggleSelectedPersonnel,
      updateSalaryDraft: state.updateSalaryDraft,
    })),
  )
}

function WorkspaceSidebar({ mode = "card" }: { mode?: "card" | "embedded" }) {
  const { clearFeedback, selectSheet, setCreateSheetOpen } = useWorkspaceActions()
  const { isBootstrapping, selectedSheetId, sheets } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      isBootstrapping: state.isBootstrapping,
      selectedSheetId: state.selectedSheetId,
      sheets: state.sheets,
    })),
  )

  const openCreateSheetDialog = () => {
    preloadCreatePayrollSheetDialog()
    startTransition(() => {
      setCreateSheetOpen(true)
    })
  }

  return (
    <PayrollSheetList
      isLoading={isBootstrapping}
      mode={mode}
      onCreate={openCreateSheetDialog}
      onCreateIntent={preloadCreatePayrollSheetDialog}
      onSelect={(sheetId) => {
        clearFeedback()
        void selectSheet(sheetId)
      }}
      selectedSheetId={selectedSheetId}
      sheets={sheets}
    />
  )
}

function WorkspaceEmptyStateCard() {
  const { setCreateSheetOpen } = useWorkspaceActions()
  const isBootstrapping = usePayrollWorkspaceStore(
    (state) => state.isBootstrapping,
  )

  const openCreateSheetDialog = () => {
    preloadCreatePayrollSheetDialog()
    startTransition(() => {
      setCreateSheetOpen(true)
    })
  }

  return (
    <Card className="border-white/60 bg-white/80 shadow-xl shadow-slate-900/10 backdrop-blur">
      <div className="grid min-h-[34rem] gap-0 lg:grid-cols-[23rem_minmax(0,1fr)]">
        <section className="border-b border-border/60 p-4 lg:border-r lg:border-b-0">
          <WorkspaceSidebar mode="embedded" />
        </section>
        <section className="flex min-w-0 p-4">
          {isBootstrapping ? (
            <LoadingState label="正在读取工资详情..." />
          ) : (
            <EmptyPanel
              title="工资工作台已就绪"
              description="创建一张工资表后，你就可以从往期导入人员，或者从人员库多选加入，然后直接录入实发工资。"
              actionLabel="创建工资表"
              onAction={openCreateSheetDialog}
              onActionIntent={preloadCreatePayrollSheetDialog}
            />
          )}
        </section>
      </div>
      <WorkspaceDialogs isBusy={false} />
    </Card>
  )
}

function WorkspaceMainCard() {
  const { removeSelectedPersonnelFromSheet, setCreateSheetOpen, setPersonnelDialogOpen } =
    useWorkspaceActions()
  const {
    errorMessage,
    isAddingPersonnel,
    isBootstrapping,
    isCreatingPersonnel,
    isCreatingSheet,
    isDetailLoading,
    isRemovingPersonnel,
    notice,
    selectedPersonnelIds,
    selectedSheetId,
    sheetDetail,
    sheets,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      errorMessage: state.errorMessage,
      isAddingPersonnel: state.isAddingPersonnel,
      isBootstrapping: state.isBootstrapping,
      isCreatingPersonnel: state.isCreatingPersonnel,
      isCreatingSheet: state.isCreatingSheet,
      isDetailLoading: state.isDetailLoading,
      isRemovingPersonnel: state.isRemovingPersonnel,
      notice: state.notice,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
    })),
  )

  const selectedSheetSummary =
    sheets.find((sheet) => sheet.id === selectedSheetId) ?? null
  const isBusy =
    isCreatingSheet ||
    isCreatingPersonnel ||
    isAddingPersonnel ||
    isRemovingPersonnel
  const openCreateSheetDialog = () => {
    preloadCreatePayrollSheetDialog()
    startTransition(() => {
      setCreateSheetOpen(true)
    })
  }
  const openPersonnelDialog = () => {
    preloadPersonnelPickerDialog()
    startTransition(() => {
      setPersonnelDialogOpen(true)
    })
  }

  return (
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
              onClick={openPersonnelDialog}
              onFocus={preloadPersonnelPickerDialog}
              onMouseEnter={preloadPersonnelPickerDialog}
            >
              <UsersRound className="size-4" />
              从人员库添加
            </Button>
            <Button
              variant="destructive"
              className="rounded-full px-4"
              disabled={selectedSheetId === null || selectedPersonnelIds.length === 0}
              onClick={() => void removeSelectedPersonnelFromSheet()}
            >
              批量移除
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4 px-4 pb-4">
        {errorMessage ? <MessageBar variant="error">{errorMessage}</MessageBar> : null}
        {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}

        {isBootstrapping ? (
          <LoadingState label="正在读取工资详情..." />
        ) : !selectedSheetSummary ? (
          <EmptyPanel
            title="工资工作台已就绪"
            description="创建一张工资表后，你就可以从往期导入人员，或者从人员库多选加入，然后直接录入实发工资。"
            actionLabel="创建工资表"
            onAction={openCreateSheetDialog}
            onActionIntent={preloadCreatePayrollSheetDialog}
          />
        ) : isDetailLoading ? (
          <LoadingState label="正在读取当前工资表..." />
        ) : sheetDetail?.records.length ? (
          <WorkspaceTableSection />
        ) : (
          <EmptyPanel
            title="这张工资表还没有人员"
            description="从人员库多选加入，或新建人员后直接加入到当前工资表。"
            actionLabel="从人员库添加"
            onAction={openPersonnelDialog}
            onActionIntent={preloadPersonnelPickerDialog}
          />
        )}
      </CardContent>
      <WorkspaceDialogs isBusy={isBusy} />
    </Card>
  )
}

function WorkspaceTableSection() {
  const { saveNetPay, toggleSelectedPersonnel, updateSalaryDraft } =
    useWorkspaceActions()
  const { salaryDrafts, savingRecordIds, selectedPersonnelIds, sheetDetail } =
    usePayrollWorkspaceStore(
      useShallow((state) => ({
        salaryDrafts: state.salaryDrafts,
        savingRecordIds: state.savingRecordIds,
        selectedPersonnelIds: state.selectedPersonnelIds,
        sheetDetail: state.sheetDetail,
      })),
    )

  const records = sheetDetail?.records ?? []
  const selectedPersonnelIdSet = useMemo(
    () => new Set(selectedPersonnelIds),
    [selectedPersonnelIds],
  )
  const savingRecordIdSet = useMemo(
    () => new Set(savingRecordIds),
    [savingRecordIds],
  )
  const totalNetPay = useMemo(
    () => records.reduce((sum, record) => sum + record.netPay, 0),
    [records],
  )

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile
          icon={<UsersRound className="size-4" />}
          label="当前人数"
          value={`${records.length} 人`}
        />
        <SummaryTile
          icon={<CircleDollarSign className="size-4" />}
          label="工资合计"
          value={`¥ ${formatMoney(totalNetPay)}`}
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
        records={records}
        savingRecordIdSet={savingRecordIdSet}
        selectedPersonnelIdSet={selectedPersonnelIdSet}
      />
    </>
  )
}

function WorkspaceDialogs({ isBusy }: { isBusy: boolean }) {
  const {
    addSelectedPersonnelToSheet,
    createPersonnelRecord,
    createSheet,
    setCreateSheetOpen,
    setPersonnelDialogOpen,
    togglePickerSelection,
  } = useWorkspaceActions()
  const {
    isCreateSheetOpen,
    isPersonnelDialogOpen,
    personnel,
    pickerSelection,
    selectedSheetId,
    sheetDetail,
    sheets,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      isCreateSheetOpen: state.isCreateSheetOpen,
      isPersonnelDialogOpen: state.isPersonnelDialogOpen,
      personnel: state.personnel,
      pickerSelection: state.pickerSelection,
      selectedSheetId: state.selectedSheetId,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
    })),
  )

  const currentSheetPersonIds = useMemo(
    () =>
      new Set((sheetDetail?.records ?? []).map((record) => record.personnelId)),
    [sheetDetail],
  )
  const pickerSelectionSet = useMemo(
    () => new Set(pickerSelection),
    [pickerSelection],
  )

  const handleCreateSheet = async (values: CreatePayrollSheetValues) =>
    createSheet({
      name: values.name,
      sourceSheetId: values.sourceSheetId ? Number(values.sourceSheetId) : null,
    })

  const handleCreatePersonnel = async (values: CreatePersonnelValues) =>
    createPersonnelRecord({
      name: values.name,
      jobType: values.jobType || null,
      phoneNumber: values.phoneNumber || null,
    })

  return (
    <Suspense fallback={<DialogFallback />}>
      {isCreateSheetOpen ? (
        <CreatePayrollSheetDialog
          isBusy={isBusy}
          onOpenChange={setCreateSheetOpen}
          onSubmit={handleCreateSheet}
          open={isCreateSheetOpen}
          sheets={sheets}
        />
      ) : null}

      {isPersonnelDialogOpen ? (
        <PersonnelPickerDialog
          currentSheetPersonIds={currentSheetPersonIds}
          isBusy={isBusy || selectedSheetId === null}
          onAddSelected={addSelectedPersonnelToSheet}
          onCreatePersonnel={handleCreatePersonnel}
          onOpenChange={setPersonnelDialogOpen}
          onToggleSelection={togglePickerSelection}
          open={isPersonnelDialogOpen}
          personnel={personnel}
          pickerSelection={pickerSelection}
          pickerSelectionSet={pickerSelectionSet}
        />
      ) : null}
    </Suspense>
  )
}

export function PayrollWorkspaceWidget() {
  const initializeWorkspace = usePayrollWorkspaceStore(
    (state) => state.initializeWorkspace,
  )
  const selectedSheetId = usePayrollWorkspaceStore((state) => state.selectedSheetId)

  useEffect(() => {
    void initializeWorkspace()
  }, [initializeWorkspace])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(61,123,158,0.22),transparent_32%),linear-gradient(120deg,rgba(247,242,230,0.86),transparent_55%)] px-4 py-5 text-slate-900 md:px-6">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-7xl">
        {selectedSheetId === null ? (
          <WorkspaceEmptyStateCard />
        ) : (
          <div className="flex gap-4">
            <section className="flex w-full max-w-sm flex-col gap-4">
              <WorkspaceSidebar />
            </section>

            <section className="flex min-w-0 flex-1 flex-col gap-4">
              <WorkspaceMainCard />
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
