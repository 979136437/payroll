import { create } from "zustand"

import {
  createPersonnel,
  listPersonnel,
  type CreatePersonnelPayload,
  type Personnel,
} from "@/entities/personnel/api/personnel"
import {
  addPersonnelToSheet,
  createPayrollSheet,
  getPayrollSheetDetail,
  listPayrollSheets,
  removePersonnelFromSheet,
  updatePayrollRecordNetPay,
  type CreatePayrollSheetPayload,
  type PayrollRecord,
  type PayrollSheetDetail,
  type PayrollSheetSummary,
} from "@/entities/payroll-sheet/api/payroll-sheet"
import { formatCurrencyInput, readableError } from "@/shared/lib/formatters"

const COPY = {
  addPersonnelFailed: "\u52a0\u5165\u4eba\u5458\u5931\u8d25",
  createdPersonnel: "\u4eba\u5458\u5df2\u65b0\u589e\u5230\u4eba\u5458\u5e93",
  createdSheet: "\u5de5\u8d44\u8868\u5df2\u521b\u5efa",
  createPersonnelFailed: "\u65b0\u589e\u4eba\u5458\u5931\u8d25",
  createSheetFailed: "\u521b\u5efa\u5de5\u8d44\u8868\u5931\u8d25",
  currentSelectionExists:
    "\u6240\u9009\u4eba\u5458\u5df2\u5728\u5f53\u524d\u5de5\u8d44\u8868\u4e2d",
  invalidSalary: "\u8bf7\u8f93\u5165\u6709\u6548\u7684\u5de5\u8d44\u91d1\u989d",
  loadWorkspaceFailed: "\u8bfb\u53d6\u5de5\u8d44\u5de5\u4f5c\u53f0\u5931\u8d25",
  removedPersonnel: "\u5df2\u79fb\u9664\u9009\u4e2d\u4eba\u5458",
  removePersonnelFailed: "\u79fb\u9664\u4eba\u5458\u5931\u8d25",
  savePayFailed: "\u4fdd\u5b58\u5de5\u8d44\u5931\u8d25",
  savedPay: "\u5de5\u8d44\u5df2\u4fdd\u5b58",
  savedPayFor: "\u5df2\u4fdd\u5b58 {name} \u7684\u5de5\u8d44",
  sheetPersonnelAdded: "\u4eba\u5458\u5df2\u52a0\u5165\u5f53\u524d\u5de5\u8d44\u8868",
}

type PayrollWorkspaceStore = {
  errorMessage: string | null
  hasInitialized: boolean
  isAddingPersonnel: boolean
  isBootstrapping: boolean
  isCreateSheetOpen: boolean
  isCreatingPersonnel: boolean
  isCreatingSheet: boolean
  isDetailLoading: boolean
  isPersonnelDialogOpen: boolean
  isRemovingPersonnel: boolean
  notice: string | null
  personnel: Personnel[]
  pickerSelection: number[]
  salaryDrafts: Record<number, string>
  savingRecordIds: number[]
  selectedPersonnelIds: number[]
  selectedSheetId: number | null
  sheetDetail: PayrollSheetDetail | null
  sheets: PayrollSheetSummary[]
  addSelectedPersonnelToSheet: () => Promise<void>
  clearFeedback: () => void
  createPersonnelRecord: (payload: CreatePersonnelPayload) => Promise<boolean>
  createSheet: (payload: CreatePayrollSheetPayload) => Promise<boolean>
  initializeWorkspace: () => Promise<void>
  refreshWorkspace: (preferredSheetId?: number | null) => Promise<void>
  removeSelectedPersonnelFromSheet: () => Promise<void>
  saveNetPay: (record: PayrollRecord) => Promise<void>
  selectSheet: (sheetId: number) => Promise<void>
  setCreateSheetOpen: (open: boolean) => void
  setPersonnelDialogOpen: (open: boolean) => void
  togglePickerSelection: (personnelId: number) => void
  toggleSelectedPersonnel: (personnelId: number) => void
  updateSalaryDraft: (recordId: number, value: string) => void
}

let workspaceRequestId = 0

function buildSalaryDrafts(records: PayrollRecord[]) {
  return Object.fromEntries(
    records.map((record) => [record.recordId, formatCurrencyInput(record.netPay)]),
  ) as Record<number, string>
}

function resolveSheetId(
  sheets: PayrollSheetSummary[],
  selectedSheetId: number | null,
  preferredSheetId?: number | null,
) {
  if (
    preferredSheetId !== undefined &&
    preferredSheetId !== null &&
    sheets.some((sheet) => sheet.id === preferredSheetId)
  ) {
    return preferredSheetId
  }

  if (
    selectedSheetId !== null &&
    sheets.some((sheet) => sheet.id === selectedSheetId)
  ) {
    return selectedSheetId
  }

  return sheets[0]?.id ?? null
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids)]
}

function paySavedMessage(name?: string | null) {
  return name
    ? COPY.savedPayFor.replace("{name}", name)
    : COPY.savedPay
}

export const usePayrollWorkspaceStore = create<PayrollWorkspaceStore>(
  (set, get) => ({
    errorMessage: null,
    hasInitialized: false,
    isAddingPersonnel: false,
    isBootstrapping: false,
    isCreateSheetOpen: false,
    isCreatingPersonnel: false,
    isCreatingSheet: false,
    isDetailLoading: false,
    isPersonnelDialogOpen: false,
    isRemovingPersonnel: false,
    notice: null,
    personnel: [],
    pickerSelection: [],
    salaryDrafts: {},
    savingRecordIds: [],
    selectedPersonnelIds: [],
    selectedSheetId: null,
    sheetDetail: null,
    sheets: [],

    async initializeWorkspace() {
      const { hasInitialized, isBootstrapping } = get()
      if (hasInitialized || isBootstrapping) {
        return
      }

      set({ isBootstrapping: true })

      try {
        await get().refreshWorkspace()
        set({ hasInitialized: true })
      } finally {
        set({ isBootstrapping: false })
      }
    },

    async refreshWorkspace(preferredSheetId) {
      const requestId = ++workspaceRequestId
      set({ isDetailLoading: true })

      try {
        const [personnel, sheets] = await Promise.all([
          listPersonnel(),
          listPayrollSheets(),
        ])
        const nextSheetId = resolveSheetId(
          sheets,
          get().selectedSheetId,
          preferredSheetId,
        )

        if (requestId !== workspaceRequestId) {
          return
        }

        set({
          errorMessage: null,
          personnel,
          selectedSheetId: nextSheetId,
          sheets,
        })

        if (nextSheetId === null) {
          set({
            isDetailLoading: false,
            pickerSelection: [],
            salaryDrafts: {},
            selectedPersonnelIds: [],
            sheetDetail: null,
          })
          return
        }

        const detail = await getPayrollSheetDetail(nextSheetId)

        if (requestId !== workspaceRequestId) {
          return
        }

        set({
          isDetailLoading: false,
          pickerSelection: get().pickerSelection.filter((personnelId) =>
            personnel.some((person) => person.id === personnelId),
          ),
          salaryDrafts: buildSalaryDrafts(detail?.records ?? []),
          selectedPersonnelIds: [],
          sheetDetail: detail,
        })
      } catch (error) {
        if (requestId !== workspaceRequestId) {
          return
        }

        set({
          errorMessage: readableError(error, COPY.loadWorkspaceFailed),
          isDetailLoading: false,
          notice: null,
        })
      }
    },

    async selectSheet(sheetId) {
      set({
        errorMessage: null,
        notice: null,
        pickerSelection: [],
        selectedPersonnelIds: [],
        selectedSheetId: sheetId,
      })

      await get().refreshWorkspace(sheetId)
    },

    setCreateSheetOpen(open) {
      set({ isCreateSheetOpen: open })
    },

    setPersonnelDialogOpen(open) {
      set({
        isPersonnelDialogOpen: open,
        pickerSelection: [],
      })
    },

    clearFeedback() {
      set({ errorMessage: null, notice: null })
    },

    toggleSelectedPersonnel(personnelId) {
      set((state) => ({
        selectedPersonnelIds: state.selectedPersonnelIds.includes(personnelId)
          ? state.selectedPersonnelIds.filter((item) => item !== personnelId)
          : [...state.selectedPersonnelIds, personnelId],
      }))
    },

    togglePickerSelection(personnelId) {
      const existingIds = new Set(
        (get().sheetDetail?.records ?? []).map((record) => record.personnelId),
      )

      if (existingIds.has(personnelId)) {
        return
      }

      set((state) => ({
        pickerSelection: state.pickerSelection.includes(personnelId)
          ? state.pickerSelection.filter((item) => item !== personnelId)
          : [...state.pickerSelection, personnelId],
      }))
    },

    updateSalaryDraft(recordId, value) {
      set((state) => ({
        salaryDrafts: {
          ...state.salaryDrafts,
          [recordId]: value,
        },
      }))
    },

    async createSheet(payload) {
      set({
        errorMessage: null,
        isCreatingSheet: true,
        notice: null,
      })

      try {
        const created = await createPayrollSheet(payload)

        set({
          isCreateSheetOpen: false,
          notice: COPY.createdSheet,
        })

        await get().refreshWorkspace(created.id)
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, COPY.createSheetFailed),
          notice: null,
        })
        return false
      } finally {
        set({ isCreatingSheet: false })
      }
    },

    async createPersonnelRecord(payload) {
      set({
        errorMessage: null,
        isCreatingPersonnel: true,
        notice: null,
      })

      try {
        const created = await createPersonnel(payload)
        const personnel = await listPersonnel()

        set((state) => ({
          notice: COPY.createdPersonnel,
          personnel,
          pickerSelection: state.pickerSelection.includes(created.id)
            ? state.pickerSelection
            : [...state.pickerSelection, created.id],
        }))

        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, COPY.createPersonnelFailed),
          notice: null,
        })
        return false
      } finally {
        set({ isCreatingPersonnel: false })
      }
    },

    async addSelectedPersonnelToSheet() {
      const { pickerSelection, selectedSheetId, sheetDetail } = get()

      if (selectedSheetId === null) {
        return
      }

      const existingIds = new Set(
        (sheetDetail?.records ?? []).map((record) => record.personnelId),
      )
      const nextPersonnelIds = pickerSelection.filter(
        (personnelId) => !existingIds.has(personnelId),
      )

      if (nextPersonnelIds.length === 0) {
        set({
          isPersonnelDialogOpen: false,
          notice: COPY.currentSelectionExists,
          pickerSelection: [],
        })
        return
      }

      set({
        errorMessage: null,
        isAddingPersonnel: true,
        notice: null,
      })

      try {
        await addPersonnelToSheet(selectedSheetId, uniqueIds(nextPersonnelIds))

        set({
          isPersonnelDialogOpen: false,
          notice: COPY.sheetPersonnelAdded,
          pickerSelection: [],
        })

        await get().refreshWorkspace(selectedSheetId)
      } catch (error) {
        set({
          errorMessage: readableError(error, COPY.addPersonnelFailed),
          notice: null,
        })
      } finally {
        set({ isAddingPersonnel: false })
      }
    },

    async removeSelectedPersonnelFromSheet() {
      const { selectedPersonnelIds, selectedSheetId } = get()

      if (selectedSheetId === null || selectedPersonnelIds.length === 0) {
        return
      }

      set({
        errorMessage: null,
        isRemovingPersonnel: true,
        notice: null,
      })

      try {
        await removePersonnelFromSheet(selectedSheetId, selectedPersonnelIds)

        set({
          notice: COPY.removedPersonnel,
          selectedPersonnelIds: [],
        })

        await get().refreshWorkspace(selectedSheetId)
      } catch (error) {
        set({
          errorMessage: readableError(error, COPY.removePersonnelFailed),
          notice: null,
        })
      } finally {
        set({ isRemovingPersonnel: false })
      }
    },

    async saveNetPay(record) {
      const draftValue =
        get().salaryDrafts[record.recordId] ?? formatCurrencyInput(record.netPay)
      const parsed = Number(draftValue)

      if (Number.isNaN(parsed)) {
        set((state) => ({
          errorMessage: COPY.invalidSalary,
          salaryDrafts: {
            ...state.salaryDrafts,
            [record.recordId]: formatCurrencyInput(record.netPay),
          },
        }))
        return
      }

      if (parsed === record.netPay) {
        return
      }

      set((state) => ({
        errorMessage: null,
        notice: null,
        savingRecordIds: uniqueIds([...state.savingRecordIds, record.recordId]),
      }))

      try {
        const updated = await updatePayrollRecordNetPay(record.recordId, parsed)

        set((state) => ({
          notice: paySavedMessage(updated?.name),
          salaryDrafts: {
            ...state.salaryDrafts,
            [record.recordId]: formatCurrencyInput(parsed),
          },
        }))

        await get().refreshWorkspace(get().selectedSheetId)
      } catch (error) {
        set((state) => ({
          errorMessage: readableError(error, COPY.savePayFailed),
          notice: null,
          salaryDrafts: {
            ...state.salaryDrafts,
            [record.recordId]: formatCurrencyInput(record.netPay),
          },
        }))
      } finally {
        set((state) => ({
          savingRecordIds: state.savingRecordIds.filter(
            (item) => item !== record.recordId,
          ),
        }))
      }
    },
  }),
)
