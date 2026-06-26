import { lazy, Suspense, useCallback, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import type { CreatePayrollSheetValues } from "@/features/create-payroll-sheet/model/schema"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { CreateOrEditPersonnelDialog } from "@/features/manage-personnel/ui/create-or-edit-personnel-dialog"
import { LoadingState } from "@/shared/ui/workspace-primitives"
import {
  selectAvailablePersonnelForPicker,
  usePayrollWorkspaceStore,
} from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

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

function DialogFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <LoadingState label="正在加载弹窗..." />
      </div>
    </div>
  )
}

export function PayrollWorkspaceDialogs() {
  const {
    addPendingPersonnel,
    createPersonnelRecord,
    createSheet,
    deletePersonnelFromWorkspace,
    isAddingPersonnel,
    isCreatingPersonnel,
    isCreatingSheet,
    isDeletingPersonnel,
    isRemovingPersonnel,
    isUpdatingPersonnel,
    removePendingPersonnel,
    removeSelectedPendingPersonnel,
    setCreateSheetOpen,
    setPendingAddNetPayDraft,
    setPersonnelDialogOpen,
    setPersonnelEditDialogOpen,
    setPersonnelPickerQuery,
    setPickerCreatePersonnelDialogOpen,
    submitPendingPersonnelToSheet,
    togglePendingSelection,
    updatePersonnelFromWorkspace,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      addPendingPersonnel: state.addPendingPersonnel,
      createPersonnelRecord: state.createPersonnelRecord,
      createSheet: state.createSheet,
      deletePersonnelFromWorkspace: state.deletePersonnelFromWorkspace,
      isAddingPersonnel: state.isAddingPersonnel,
      isCreatingPersonnel: state.isCreatingPersonnel,
      isCreatingSheet: state.isCreatingSheet,
      isDeletingPersonnel: state.isDeletingPersonnel,
      isRemovingPersonnel: state.isRemovingPersonnel,
      isUpdatingPersonnel: state.isUpdatingPersonnel,
      removePendingPersonnel: state.removePendingPersonnel,
      removeSelectedPendingPersonnel: state.removeSelectedPendingPersonnel,
      setCreateSheetOpen: state.setCreateSheetOpen,
      setPendingAddNetPayDraft: state.setPendingAddNetPayDraft,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
      setPersonnelEditDialogOpen: state.setPersonnelEditDialogOpen,
      setPersonnelPickerQuery: state.setPersonnelPickerQuery,
      setPickerCreatePersonnelDialogOpen: state.setPickerCreatePersonnelDialogOpen,
      submitPendingPersonnelToSheet: state.submitPendingPersonnelToSheet,
      togglePendingSelection: state.togglePendingSelection,
      updatePersonnelFromWorkspace: state.updatePersonnelFromWorkspace,
    })),
  )

  const {
    editingPersonnel,
    isCreateSheetOpen,
    isPersonnelDialogOpen,
    isPersonnelEditDialogOpen,
    isPickerCreatePersonnelDialogOpen,
    pendingAddNetPayDraft,
    perPersonNetPayDrafts,
    pendingAddPersonnelIds,
    pendingSelectionIds,
    personnel,
    personnelPickerQuery,
    selectedSheetId,
    setPerPersonNetPayDraft,
    sheetDetail,
    sheets,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      editingPersonnel: state.editingPersonnel,
      isCreateSheetOpen: state.isCreateSheetOpen,
      isPersonnelDialogOpen: state.isPersonnelDialogOpen,
      isPersonnelEditDialogOpen: state.isPersonnelEditDialogOpen,
      isPickerCreatePersonnelDialogOpen: state.isPickerCreatePersonnelDialogOpen,
      pendingAddNetPayDraft: state.pendingAddNetPayDraft,
      perPersonNetPayDrafts: state.perPersonNetPayDrafts,
      pendingAddPersonnelIds: state.pendingAddPersonnelIds,
      pendingSelectionIds: state.pendingSelectionIds,
      personnel: state.personnel,
      personnelPickerQuery: state.personnelPickerQuery,
      selectedSheetId: state.selectedSheetId,
      setPerPersonNetPayDraft: state.setPerPersonNetPayDraft,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
    })),
  )

  const isBusy =
    isCreatingSheet ||
    isCreatingPersonnel ||
    isAddingPersonnel ||
    isRemovingPersonnel

  const personnelById = useMemo(
    () => new Map(personnel.map((person) => [person.id, person])),
    [personnel],
  )
  const availablePersonnel = useMemo(
    () =>
      selectAvailablePersonnelForPicker({
        pendingAddPersonnelIds,
        personnel,
        query: personnelPickerQuery,
        sheetDetail,
      }),
    [pendingAddPersonnelIds, personnel, personnelPickerQuery, sheetDetail],
  )
  const pendingPersonnel = useMemo(
    () =>
      pendingAddPersonnelIds
        .map((personnelId) => personnelById.get(personnelId))
        .filter((person): person is NonNullable<typeof person> => Boolean(person)),
    [pendingAddPersonnelIds, personnelById],
  )

  const handleOpenCreatePersonnel = useCallback(
    () => setPickerCreatePersonnelDialogOpen(true),
    [setPickerCreatePersonnelDialogOpen],
  )

  const handleCreateSheet = async (values: CreatePayrollSheetValues) =>
    createSheet({
      name: values.name,
      sourceSheetId: values.sourceSheetId ? Number(values.sourceSheetId) : null,
    })

  const handleCreatePersonnel = async (values: CreatePersonnelValues) =>
    createPersonnelRecord({
      name: values.name,
      gender: values.gender || null,
      ethnicity: values.ethnicity || null,
      nativePlace: values.nativePlace || null,
      idCardNumber: values.idCardNumber || null,
      payrollCardNumber: values.payrollCardNumber || null,
      bankName: values.bankName || null,
      phoneNumber: values.phoneNumber || null,
    })

  const handleUpdatePersonnel = async (values: CreatePersonnelValues) => {
    if (!editingPersonnel) {
      return false
    }

    return updatePersonnelFromWorkspace(editingPersonnel.id, {
      bankName: values.bankName || null,
      ethnicity: values.ethnicity || null,
      gender: values.gender || null,
      idCardNumber: values.idCardNumber || null,
      name: values.name,
      nativePlace: values.nativePlace || null,
      payrollCardNumber: values.payrollCardNumber || null,
      phoneNumber: values.phoneNumber || null,
    })
  }

  return (
    <>
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
            availablePersonnel={availablePersonnel}
            isBusy={isBusy || selectedSheetId === null}
            onAddPendingPersonnel={addPendingPersonnel}
            onOpenChange={setPersonnelDialogOpen}
            onOpenCreatePersonnel={handleOpenCreatePersonnel}
            onRemovePendingPersonnel={removePendingPersonnel}
            onRemoveSelectedPendingPersonnel={removeSelectedPendingPersonnel}
            onSetNetPayDraft={setPendingAddNetPayDraft}
            onSetPersonNetPayDraft={setPerPersonNetPayDraft}
            onSetQuery={setPersonnelPickerQuery}
            onSubmit={submitPendingPersonnelToSheet}
            onTogglePendingSelection={togglePendingSelection}
            open={isPersonnelDialogOpen}
            pendingAddNetPayDraft={pendingAddNetPayDraft}
            perPersonNetPayDrafts={perPersonNetPayDrafts}
            pendingPersonnel={pendingPersonnel}
            pendingSelectionIds={pendingSelectionIds}
            query={personnelPickerQuery}
          />
        ) : null}
      </Suspense>

      {isPickerCreatePersonnelDialogOpen ? (
        <CreateOrEditPersonnelDialog
          isBusy={isCreatingPersonnel}
          mode="create"
          onOpenChange={setPickerCreatePersonnelDialogOpen}
          onSubmit={handleCreatePersonnel}
          open={isPickerCreatePersonnelDialogOpen}
        />
      ) : null}

      {isPersonnelEditDialogOpen && editingPersonnel ? (
        <CreateOrEditPersonnelDialog
          initialPersonnel={editingPersonnel}
          isBusy={isUpdatingPersonnel}
          isDeleting={isDeletingPersonnel}
          mode="edit"
          onDelete={async () => {
            await deletePersonnelFromWorkspace(editingPersonnel.id)
          }}
          onOpenChange={setPersonnelEditDialogOpen}
          onSubmit={handleUpdatePersonnel}
          open={isPersonnelEditDialogOpen}
          showDeleteAction
        />
      ) : null}
    </>
  )
}
