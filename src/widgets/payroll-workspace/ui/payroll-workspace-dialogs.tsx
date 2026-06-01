import { lazy, Suspense, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import type { CreatePayrollSheetValues } from "@/features/create-payroll-sheet/model/schema"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
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
    isAddingPersonnel,
    isCreatingPersonnel,
    isCreatingSheet,
    isRemovingPersonnel,
    setCreateSheetOpen,
    setPersonnelDialogOpen,
    togglePickerSelection,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      addSelectedPersonnelToSheet: state.addSelectedPersonnelToSheet,
      createPersonnelRecord: state.createPersonnelRecord,
      createSheet: state.createSheet,
      isAddingPersonnel: state.isAddingPersonnel,
      isCreatingPersonnel: state.isCreatingPersonnel,
      isCreatingSheet: state.isCreatingSheet,
      isRemovingPersonnel: state.isRemovingPersonnel,
      setCreateSheetOpen: state.setCreateSheetOpen,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
      togglePickerSelection: state.togglePickerSelection,
    })),
  )

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
