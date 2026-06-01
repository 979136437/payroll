import { lazy, Suspense, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import type { CreatePayrollSheetValues } from "@/features/create-payroll-sheet/model/schema"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { CreateOrEditPersonnelDialog } from "@/features/manage-personnel/ui/create-or-edit-personnel-dialog"
import { LoadingState } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

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
    addSelectedPersonnelToSheet,
    createPersonnelRecord,
    createSheet,
    deletePersonnelFromWorkspace,
    isAddingPersonnel,
    isCreatingPersonnel,
    isCreatingSheet,
    isDeletingPersonnel,
    isRemovingPersonnel,
    isUpdatingPersonnel,
    setCreateSheetOpen,
    setPersonnelDialogOpen,
    setPersonnelEditDialogOpen,
    togglePickerSelection,
    updatePersonnelFromWorkspace,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      addSelectedPersonnelToSheet: state.addSelectedPersonnelToSheet,
      createPersonnelRecord: state.createPersonnelRecord,
      createSheet: state.createSheet,
      deletePersonnelFromWorkspace: state.deletePersonnelFromWorkspace,
      isAddingPersonnel: state.isAddingPersonnel,
      isCreatingPersonnel: state.isCreatingPersonnel,
      isCreatingSheet: state.isCreatingSheet,
      isDeletingPersonnel: state.isDeletingPersonnel,
      isRemovingPersonnel: state.isRemovingPersonnel,
      isUpdatingPersonnel: state.isUpdatingPersonnel,
      setCreateSheetOpen: state.setCreateSheetOpen,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
      setPersonnelEditDialogOpen: state.setPersonnelEditDialogOpen,
      togglePickerSelection: state.togglePickerSelection,
      updatePersonnelFromWorkspace: state.updatePersonnelFromWorkspace,
    })),
  )

  const {
    editingPersonnel,
    isCreateSheetOpen,
    isPersonnelDialogOpen,
    isPersonnelEditDialogOpen,
    personnel,
    pickerSelection,
    selectedSheetId,
    sheetDetail,
    sheets,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      editingPersonnel: state.editingPersonnel,
      isCreateSheetOpen: state.isCreateSheetOpen,
      isPersonnelDialogOpen: state.isPersonnelDialogOpen,
      isPersonnelEditDialogOpen: state.isPersonnelEditDialogOpen,
      personnel: state.personnel,
      pickerSelection: state.pickerSelection,
      selectedSheetId: state.selectedSheetId,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
    })),
  )

  const isBusy =
    isCreatingSheet ||
    isCreatingPersonnel ||
    isAddingPersonnel ||
    isRemovingPersonnel

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
