import { create } from "zustand"

import type {
  CreatePersonnelPayload,
  Personnel,
  UpdatePersonnelPayload,
} from "@/entities/personnel/api/personnel"
import {
  type CreatePayrollSheetPayload,
  type PayrollRecord,
  type PayrollSheetDetail,
  type PayrollSheetSummary,
} from "@/entities/payroll-sheet/api/payroll-sheet"
import { formatCurrencyInput, readableError } from "@/shared/lib/formatters"
import { getPersonnelDataRevision } from "@/shared/model/personnel-data-revision"
import { payrollWorkspaceApi } from "@/widgets/payroll-workspace/model/workspace-api"

export type PayrollWorkspaceView = "overview" | "sheet-detail"

type PayrollWorkspaceStore = {
  currentView: PayrollWorkspaceView
  editingPersonnel: Personnel | null
  errorMessage: string | null
  hasInitialized: boolean
  isAddingPersonnel: boolean
  isBootstrapping: boolean
  isCreateSheetOpen: boolean
  isCreatingPersonnel: boolean
  isCreatingSheet: boolean
  isDeletingSheet: boolean
  isDeletingPersonnel: boolean
  isDetailLoading: boolean
  isExportingSheet: boolean
  isPersonnelDialogOpen: boolean
  isPersonnelEditDialogOpen: boolean
  isRemovingPersonnel: boolean
  isUpdatingPersonnel: boolean
  notice: string | null
  personnel: Personnel[]
  personnelDataRevisionSeen: number
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
  deletePayrollSheet: (sheetId: number) => Promise<boolean>
  deletePersonnelFromWorkspace: (personnelId: number) => Promise<boolean>
  exportCurrentSheet: () => Promise<boolean>
  initializeWorkspace: () => Promise<void>
  openPersonnelEditDialog: (personnelId: number) => void
  openSheetDetail: (sheetId: number) => Promise<void>
  refreshWorkspace: (preferredSheetId?: number | null) => Promise<void>
  removeSelectedPersonnelFromSheet: () => Promise<void>
  saveNetPay: (record: PayrollRecord) => Promise<void>
  selectSheet: (sheetId: number) => Promise<void>
  setCreateSheetOpen: (open: boolean) => void
  setPersonnelDialogOpen: (open: boolean) => void
  setPersonnelEditDialogOpen: (open: boolean) => void
  showOverview: () => void
  toggleAllPickerSelection: () => void
  togglePickerSelection: (personnelId: number) => void
  toggleSelectedPersonnel: (personnelId: number) => void
  updatePersonnelFromWorkspace: (
    personnelId: number,
    payload: UpdatePersonnelPayload,
  ) => Promise<boolean>
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

function buildIdSet(ids: number[]) {
  return new Set(ids)
}

function paySavedMessage(name?: string | null) {
  return name ? `已保存 ${name} 的工资` : "工资已保存"
}

function currentTimestampString() {
  return String(Math.floor(Date.now() / 1000))
}

export const usePayrollWorkspaceStore = create<PayrollWorkspaceStore>((set, get) => ({
  currentView: "overview",
  editingPersonnel: null,
  errorMessage: null,
  hasInitialized: false,
  isAddingPersonnel: false,
  isBootstrapping: false,
  isCreateSheetOpen: false,
  isCreatingPersonnel: false,
  isCreatingSheet: false,
  isDeletingSheet: false,
  isDeletingPersonnel: false,
  isDetailLoading: false,
  isExportingSheet: false,
  isPersonnelDialogOpen: false,
  isPersonnelEditDialogOpen: false,
  isRemovingPersonnel: false,
  isUpdatingPersonnel: false,
  notice: null,
  personnel: [],
  personnelDataRevisionSeen: 0,
  pickerSelection: [],
  salaryDrafts: {},
  savingRecordIds: [],
  selectedPersonnelIds: [],
  selectedSheetId: null,
  sheetDetail: null,
  sheets: [],

  async initializeWorkspace() {
    const { hasInitialized, isBootstrapping, personnelDataRevisionSeen } = get()
    const latestPersonnelDataRevision = getPersonnelDataRevision()
    const needsPersonnelRefresh =
      hasInitialized && latestPersonnelDataRevision !== personnelDataRevisionSeen

    if (isBootstrapping) {
      return
    }

    if (hasInitialized && !needsPersonnelRefresh) {
      return
    }

    set({ isBootstrapping: true })

    try {
      await get().refreshWorkspace()
      if (!get().errorMessage) {
        set({
          hasInitialized: true,
          personnelDataRevisionSeen: latestPersonnelDataRevision,
        })
      }
    } finally {
      set({ isBootstrapping: false })
    }
  },

  async refreshWorkspace(preferredSheetId) {
    const requestId = ++workspaceRequestId
    set({ isDetailLoading: true })

    try {
      const [personnel, sheets] = await Promise.all([
        payrollWorkspaceApi.listPersonnel(),
        payrollWorkspaceApi.listPayrollSheets(),
      ])
      const personnelIdSet = buildIdSet(personnel.map((person) => person.id))
      const nextSheetId = resolveSheetId(
        sheets,
        get().selectedSheetId,
        preferredSheetId,
      )

      if (requestId !== workspaceRequestId) {
        return
      }

      set({
        editingPersonnel: get().editingPersonnel
          ? personnel.find((item) => item.id === get().editingPersonnel?.id) ?? null
          : null,
        errorMessage: null,
        personnel,
        selectedSheetId: nextSheetId,
        sheets,
      })

      if (nextSheetId === null) {
        set({
          currentView: "overview",
          isDetailLoading: false,
          pickerSelection: [],
          salaryDrafts: {},
          selectedPersonnelIds: [],
          sheetDetail: null,
        })
        return
      }

      const detail = await payrollWorkspaceApi.getPayrollSheetDetail(nextSheetId)

      if (requestId !== workspaceRequestId) {
        return
      }

      const recordPersonnelIdSet = buildIdSet(
        (detail?.records ?? []).map((record) => record.personnelId),
      )

      set({
        isDetailLoading: false,
        pickerSelection: get().pickerSelection.filter((personnelId) =>
          personnelIdSet.has(personnelId),
        ),
        salaryDrafts: buildSalaryDrafts(detail?.records ?? []),
        selectedPersonnelIds: get().selectedPersonnelIds.filter((personnelId) =>
          recordPersonnelIdSet.has(personnelId),
        ),
        sheetDetail: detail,
      })
    } catch (error) {
      if (requestId !== workspaceRequestId) {
        return
      }

      set({
        errorMessage: readableError(error, "读取工资工作台失败"),
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

  async openSheetDetail(sheetId) {
    await get().selectSheet(sheetId)
    set({ currentView: "sheet-detail" })
  },

  showOverview() {
    set({ currentView: "overview" })
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

  setPersonnelEditDialogOpen(open) {
    set({
      editingPersonnel: open ? get().editingPersonnel : null,
      isPersonnelEditDialogOpen: open,
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

  toggleAllPickerSelection() {
    const existingIds = new Set(
      (get().sheetDetail?.records ?? []).map((record) => record.personnelId),
    )
    const availableIds = get()
      .personnel.map((person) => person.id)
      .filter((personnelId) => !existingIds.has(personnelId))

    set((state) => {
      const hasUnselectedAvailable = availableIds.some(
        (personnelId) => !state.pickerSelection.includes(personnelId),
      )

      return {
        pickerSelection: hasUnselectedAvailable
          ? uniqueIds([...state.pickerSelection, ...availableIds])
          : state.pickerSelection.filter(
              (personnelId) => !availableIds.includes(personnelId),
            ),
      }
    })
  },

  updateSalaryDraft(recordId, value) {
    set((state) => ({
      salaryDrafts: {
        ...state.salaryDrafts,
        [recordId]: value,
      },
    }))
  },

  openPersonnelEditDialog(personnelId) {
    const target = get().personnel.find((person) => person.id === personnelId)

    if (!target) {
      set({
        errorMessage: "未找到该人员",
        notice: null,
      })
      return
    }

    set({
      editingPersonnel: target,
      errorMessage: null,
      isPersonnelEditDialogOpen: true,
      notice: null,
    })
  },

  async createSheet(payload) {
    set({
      errorMessage: null,
      isCreatingSheet: true,
      notice: null,
    })

    try {
      const created = await payrollWorkspaceApi.createPayrollSheet(payload)

      set({
        currentView: "sheet-detail",
        isCreateSheetOpen: false,
        notice: "工资表已创建",
      })

      await get().refreshWorkspace(created.id)
      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "创建工资表失败"),
        notice: null,
      })
      return false
    } finally {
      set({ isCreatingSheet: false })
    }
  },

  async deletePayrollSheet(sheetId) {
    const previousSheets = get().sheets
    const currentView = get().currentView
    const targetIndex = previousSheets.findIndex((sheet) => sheet.id === sheetId)

    if (targetIndex === -1) {
      set({
        errorMessage: "未找到该工资表",
        notice: null,
      })
      return false
    }

    const fallbackSheetId =
      previousSheets[targetIndex + 1]?.id ??
      previousSheets[targetIndex - 1]?.id ??
      null

    set({
      errorMessage: null,
      isDeletingSheet: true,
      notice: null,
    })

    try {
      const result = await payrollWorkspaceApi.deletePayrollSheet(sheetId)

      if (!result.deleted) {
        throw new Error("工资表删除失败")
      }

      await get().refreshWorkspace(fallbackSheetId)

      set({
        currentView:
          currentView === "sheet-detail" && fallbackSheetId !== null
            ? "sheet-detail"
            : "overview",
        notice: "工资表已删除",
      })
      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "删除工资表失败"),
        notice: null,
      })
      return false
    } finally {
      set({ isDeletingSheet: false })
    }
  },

  async createPersonnelRecord(payload) {
    set({
      errorMessage: null,
      isCreatingPersonnel: true,
      notice: null,
    })

    try {
      const created = await payrollWorkspaceApi.createPersonnel(payload)
      const personnel = await payrollWorkspaceApi.listPersonnel()

      set((state) => ({
        notice: "人员已新增到人员库",
        personnel,
        pickerSelection: state.pickerSelection.includes(created.id)
          ? state.pickerSelection
          : [...state.pickerSelection, created.id],
      }))

      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "新增人员失败"),
        notice: null,
      })
      return false
    } finally {
      set({ isCreatingPersonnel: false })
    }
  },

  async updatePersonnelFromWorkspace(personnelId, payload) {
    const selectedSheetId = get().selectedSheetId

    if (selectedSheetId === null) {
      set({
        errorMessage: "未选择工资表",
        notice: null,
      })
      return false
    }

    set({
      errorMessage: null,
      isUpdatingPersonnel: true,
      notice: null,
    })

    try {
      const updated = await payrollWorkspaceApi.updatePersonnel(personnelId, payload)

      if (!updated) {
        throw new Error("人员不存在")
      }

      set({
        editingPersonnel: updated,
        notice: "人员信息已更新",
      })

      await get().refreshWorkspace(selectedSheetId)

      set({
        editingPersonnel: null,
        isPersonnelEditDialogOpen: false,
      })
      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "更新人员失败"),
        notice: null,
      })
      return false
    } finally {
      set({ isUpdatingPersonnel: false })
    }
  },

  async deletePersonnelFromWorkspace(personnelId) {
    const selectedSheetId = get().selectedSheetId

    if (selectedSheetId === null) {
      set({
        errorMessage: "未选择工资表",
        notice: null,
      })
      return false
    }

    set({
      errorMessage: null,
      isDeletingPersonnel: true,
      notice: null,
    })

    try {
      await payrollWorkspaceApi.deletePersonnel(personnelId)

      set({
        notice: "人员已删除",
      })

      await get().refreshWorkspace(selectedSheetId)

      set({
        editingPersonnel: null,
        isPersonnelEditDialogOpen: false,
      })
      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "删除人员失败"),
        notice: null,
      })
      return false
      } finally {
        set({ isDeletingPersonnel: false })
      }
    },

  async exportCurrentSheet() {
    const selectedSheetId = get().selectedSheetId
    const sheetName = get().sheetDetail?.sheet.name

    if (selectedSheetId === null || !sheetName) {
      set({
        errorMessage: "未选择工资表",
        notice: null,
      })
      return false
    }

    set({
      errorMessage: null,
      isExportingSheet: true,
      notice: null,
    })

    try {
      const savePath = await payrollWorkspaceApi.pickExcelExportPath(
        `${sheetName}.xlsx`,
      )
      if (!savePath) {
        return false
      }

      const result = await payrollWorkspaceApi.exportPayrollSheetExcel(
        selectedSheetId,
        savePath,
      )

      set({
        notice: `工资表已导出到 ${result.filePath}`,
      })
      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "导出工资表失败"),
        notice: null,
      })
      return false
    } finally {
      set({ isExportingSheet: false })
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
        notice: "所选人员已在当前工资表中",
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
      await payrollWorkspaceApi.addPersonnelToSheet(
        selectedSheetId,
        uniqueIds(nextPersonnelIds),
      )

      set({
        isPersonnelDialogOpen: false,
        notice: "人员已加入当前工资表",
        pickerSelection: [],
      })

      await get().refreshWorkspace(selectedSheetId)
    } catch (error) {
      set({
        errorMessage: readableError(error, "加入人员失败"),
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
      await payrollWorkspaceApi.removePersonnelFromSheet(
        selectedSheetId,
        selectedPersonnelIds,
      )

      set({
        notice: "已移除选中人员",
        selectedPersonnelIds: [],
      })

      await get().refreshWorkspace(selectedSheetId)
    } catch (error) {
      set({
        errorMessage: readableError(error, "移除人员失败"),
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
        errorMessage: "请输入有效的工资金额",
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
      const updated = await payrollWorkspaceApi.updatePayrollRecordNetPay(
        record.recordId,
        parsed,
      )
      const updatedAt = currentTimestampString()

      set((state) => ({
        notice: paySavedMessage(updated?.name),
        salaryDrafts: {
          ...state.salaryDrafts,
          [record.recordId]: formatCurrencyInput(parsed),
        },
        sheetDetail: state.sheetDetail
          ? {
              ...state.sheetDetail,
              records: state.sheetDetail.records.map((item) =>
                item.recordId === record.recordId && updated ? updated : item,
              ),
              sheet: {
                ...state.sheetDetail.sheet,
                updatedAt,
              },
            }
          : state.sheetDetail,
        sheets: state.sheets.map((sheet) =>
          sheet.id === state.selectedSheetId
            ? {
                ...sheet,
                updatedAt,
              }
            : sheet,
        ),
      }))
    } catch (error) {
      set((state) => ({
        errorMessage: readableError(error, "保存工资失败"),
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
}))
