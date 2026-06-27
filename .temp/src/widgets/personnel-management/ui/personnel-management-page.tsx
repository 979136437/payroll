import { useEffect, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import type { Personnel } from "@/entities/personnel/api/personnel"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { CreateOrEditPersonnelDialog } from "@/features/manage-personnel/ui/create-or-edit-personnel-dialog"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { useToastFeedback } from "@/shared/ui/toast"
import { usePersonnelManagementStore } from "@/widgets/personnel-management/model/use-personnel-management-store"
import {
  PersonnelListCard,
  type PersonnelListViewState,
} from "@/widgets/personnel-management/ui/personnel-list-card"
import { PersonnelPageHeader } from "@/widgets/personnel-management/ui/personnel-page-header"
import { PersonnelSummaryTiles } from "@/widgets/personnel-management/ui/personnel-summary-tiles"
import { PersonnelTable } from "@/widgets/personnel-management/ui/personnel-table"

function matchesQuery(
  personnel: {
    idCardNumber: string | null
    name: string
    payrollCardNumber: string | null
    phoneNumber: string | null
  },
  query: string,
) {
  if (!query) {
    return true
  }

  return [
    personnel.name,
    personnel.phoneNumber ?? "",
    personnel.idCardNumber ?? "",
    personnel.payrollCardNumber ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase())
}

export function PersonnelManagementPage() {
  const [pendingDeletePersonnel, setPendingDeletePersonnel] =
    useState<Personnel | null>(null)
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false)

  const {
    clearFeedback,
    clearPersonnelSelection,
    createPersonnelRecord,
    deletePersonnelRecord,
    deleteSelectedPersonnel,
    dialogMode,
    editingPersonnel,
    errorMessage,
    exportPersonnelFile,
    hasInitialized,
    importPersonnelFile,
    initialize,
    isDeleting,
    isDeletingSelectedPersonnel,
    isDialogOpen,
    isExporting,
    isImporting,
    isLoading,
    isSubmitting,
    notice,
    openCreateDialog,
    openEditDialog,
    personnel,
    personnelPageIndex,
    personnelPageSize,
    query,
    selectedPersonnelIds,
    setDialogOpen,
    setPersonnelPageIndex,
    setPersonnelPageSize,
    setQuery,
    toggleAllPersonnelSelection,
    togglePersonnelSelection,
    updatePersonnelRecord,
  } = usePersonnelManagementStore(
    useShallow((state) => ({
      clearFeedback: state.clearFeedback,
      clearPersonnelSelection: state.clearPersonnelSelection,
      createPersonnelRecord: state.createPersonnelRecord,
      deletePersonnelRecord: state.deletePersonnelRecord,
      deleteSelectedPersonnel: state.deleteSelectedPersonnel,
      dialogMode: state.dialogMode,
      editingPersonnel: state.editingPersonnel,
      errorMessage: state.errorMessage,
      exportPersonnelFile: state.exportPersonnelFile,
      hasInitialized: state.hasInitialized,
      importPersonnelFile: state.importPersonnelFile,
      initialize: state.initialize,
      isDeleting: state.isDeleting,
      isDeletingSelectedPersonnel: state.isDeletingSelectedPersonnel,
      isDialogOpen: state.isDialogOpen,
      isExporting: state.isExporting,
      isImporting: state.isImporting,
      isLoading: state.isLoading,
      isSubmitting: state.isSubmitting,
      notice: state.notice,
      openCreateDialog: state.openCreateDialog,
      openEditDialog: state.openEditDialog,
      personnel: state.personnel,
      personnelPageIndex: state.personnelPageIndex,
      personnelPageSize: state.personnelPageSize,
      query: state.query,
      selectedPersonnelIds: state.selectedPersonnelIds,
      setDialogOpen: state.setDialogOpen,
      setPersonnelPageIndex: state.setPersonnelPageIndex,
      setPersonnelPageSize: state.setPersonnelPageSize,
      setQuery: state.setQuery,
      toggleAllPersonnelSelection: state.toggleAllPersonnelSelection,
      togglePersonnelSelection: state.togglePersonnelSelection,
      updatePersonnelRecord: state.updatePersonnelRecord,
    })),
  )

  useEffect(() => {
    if (!hasInitialized) {
      void initialize()
    }
  }, [hasInitialized, initialize])

  useToastFeedback({
    clearFeedback,
    errorMessage,
    notice,
  })

  const filteredPersonnel = useMemo(
    () => personnel.filter((item) => matchesQuery(item, query)),
    [personnel, query],
  )
  const totalPersonnelPages = Math.max(
    1,
    Math.ceil(filteredPersonnel.length / personnelPageSize),
  )
  const safePersonnelPageIndex = Math.min(
    personnelPageIndex,
    totalPersonnelPages - 1,
  )
  const paginatedPersonnel = useMemo(() => {
    const start = safePersonnelPageIndex * personnelPageSize
    return filteredPersonnel.slice(start, start + personnelPageSize)
  }, [filteredPersonnel, personnelPageSize, safePersonnelPageIndex])
  const selectedPersonnelIdSet = useMemo(
    () => new Set(selectedPersonnelIds),
    [selectedPersonnelIds],
  )

  const handleSubmit = async (values: CreatePersonnelValues) => {
    const payload = {
      bankName: values.bankName || null,
      ethnicity: values.ethnicity || null,
      gender: values.gender || null,
      idCardNumber: values.idCardNumber || null,
      name: values.name,
      nativePlace: values.nativePlace || null,
      payrollCardNumber: values.payrollCardNumber || null,
      phoneNumber: values.phoneNumber || null,
    }

    if (dialogMode === "edit" && editingPersonnel) {
      return updatePersonnelRecord(editingPersonnel.id, payload)
    }

    return createPersonnelRecord(payload)
  }

  const handleDeleteIntent = (target: Personnel) => {
    setPendingDeletePersonnel(target)
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDeletePersonnel) {
      return
    }

    const didDelete = await deletePersonnelRecord(pendingDeletePersonnel.id)
    if (didDelete) {
      setPendingDeletePersonnel(null)
    }
  }

  const handleBatchDeleteConfirm = async () => {
    const didDelete = await deleteSelectedPersonnel()
    if (didDelete) {
      setIsBatchDeleteConfirmOpen(false)
    }
  }

  const handleQueryChange = (value: string) => {
    clearFeedback()
    setQuery(value)
  }

  const listViewState: PersonnelListViewState = isLoading
    ? "loading"
    : filteredPersonnel.length > 0
      ? "list"
      : personnel.length > 0
        ? "empty-no-match"
        : "empty-no-data"

  return (
    <>
      <main className="px-4 py-6 text-foreground md:px-6">
        <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl space-y-4">
          <PersonnelPageHeader
            isExporting={isExporting}
            isImporting={isImporting}
            onExport={() => {
              void exportPersonnelFile()
            }}
            onImport={() => {
              void importPersonnelFile()
            }}
            onOpenCreate={openCreateDialog}
          />

          <PersonnelSummaryTiles
            filteredCount={filteredPersonnel.length}
            totalCount={personnel.length}
          />

          <PersonnelListCard
            isBatchDeleteBusy={isDeleting || isDeletingSelectedPersonnel}
            onClearSelection={clearPersonnelSelection}
            onOpenBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
            onOpenCreate={openCreateDialog}
            onQueryChange={handleQueryChange}
            query={query}
            selectedCount={selectedPersonnelIds.length}
            viewState={listViewState}
          >
            <PersonnelTable
              isMutating={
                isDeleting || isDeletingSelectedPersonnel || isSubmitting
              }
              onDeleteIntent={handleDeleteIntent}
              onEdit={openEditDialog}
              onPageIndexChange={setPersonnelPageIndex}
              onPageSizeChange={setPersonnelPageSize}
              onToggleAll={toggleAllPersonnelSelection}
              onToggleOne={togglePersonnelSelection}
              pageIndex={safePersonnelPageIndex}
              pageSize={personnelPageSize}
              personnel={paginatedPersonnel}
              selectedPersonnelIdSet={selectedPersonnelIdSet}
              totalFilteredCount={filteredPersonnel.length}
              totalPages={totalPersonnelPages}
            />
          </PersonnelListCard>
        </div>
      </main>

      {isDialogOpen ? (
        <CreateOrEditPersonnelDialog
          initialPersonnel={editingPersonnel}
          isBusy={isSubmitting}
          isDeleting={isDeleting}
          mode={dialogMode}
          onDelete={
            dialogMode === "edit" && editingPersonnel
              ? () => handleDeleteIntent(editingPersonnel)
              : undefined
          }
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          open={isDialogOpen}
          showDeleteAction={dialogMode === "edit"}
        />
      ) : null}

      {pendingDeletePersonnel ? (
        <ConfirmDialog
          confirmLabel="确认删除人员"
          description={`删除 ${pendingDeletePersonnel.name} 后，会同时移除其在全部工资表中的记录。`}
          isBusy={isDeleting}
          onConfirm={handleDeleteConfirm}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeletePersonnel(null)
            }
          }}
          open
          title="确认删除人员"
        />
      ) : null}

      {isBatchDeleteConfirmOpen ? (
        <ConfirmDialog
          confirmLabel="确认批量删除"
          description={`将删除已选择的 ${selectedPersonnelIds.length} 名人员，并同时移除他们在全部工资表中的记录。`}
          isBusy={isDeletingSelectedPersonnel}
          onConfirm={handleBatchDeleteConfirm}
          onOpenChange={setIsBatchDeleteConfirmOpen}
          open
          title="确认批量删除人员"
        />
      ) : null}
    </>
  )
}
