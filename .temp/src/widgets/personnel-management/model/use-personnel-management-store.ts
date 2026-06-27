import { create } from "zustand"

import type {
  CreatePersonnelPayload,
  Personnel,
  UpdatePersonnelPayload,
} from "@/entities/personnel/api/personnel"
import { readableError } from "@/shared/lib/formatters"
import { markPersonnelDataChanged } from "@/shared/model/personnel-data-revision"
import { personnelManagementApi } from "@/widgets/personnel-management/model/personnel-management-api"

type PersonnelDialogMode = "create" | "edit"

type PersonnelManagementStore = {
  dialogMode: PersonnelDialogMode
  editingPersonnel: Personnel | null
  errorMessage: string | null
  hasInitialized: boolean
  isDeleting: boolean
  isDeletingSelectedPersonnel: boolean
  isDialogOpen: boolean
  isExporting: boolean
  isImporting: boolean
  isLoading: boolean
  isSubmitting: boolean
  notice: string | null
  personnel: Personnel[]
  personnelPageIndex: number
  personnelPageSize: number
  query: string
  selectedPersonnelIds: number[]
  clearFeedback: () => void
  clearPersonnelSelection: () => void
  createPersonnelRecord: (payload: CreatePersonnelPayload) => Promise<boolean>
  deleteSelectedPersonnel: () => Promise<boolean>
  deletePersonnelRecord: (personnelId: number) => Promise<boolean>
  exportPersonnelFile: () => Promise<boolean>
  importPersonnelFile: () => Promise<boolean>
  initialize: () => Promise<void>
  loadPersonnel: () => Promise<void>
  openCreateDialog: () => void
  openEditDialog: (personnel: Personnel) => void
  setPersonnelPageIndex: (value: number) => void
  setPersonnelPageSize: (value: number) => void
  setDialogOpen: (open: boolean) => void
  setQuery: (value: string) => void
  toggleAllPersonnelSelection: (personnelIdsOnPage: number[]) => void
  togglePersonnelSelection: (personnelId: number) => void
  updatePersonnelRecord: (
    personnelId: number,
    payload: UpdatePersonnelPayload,
  ) => Promise<boolean>
}

export const usePersonnelManagementStore = create<PersonnelManagementStore>(
  (set, get) => ({
    dialogMode: "create",
    editingPersonnel: null,
    errorMessage: null,
    hasInitialized: false,
    isDeleting: false,
    isDeletingSelectedPersonnel: false,
    isDialogOpen: false,
    isExporting: false,
    isImporting: false,
    isLoading: false,
    isSubmitting: false,
    notice: null,
    personnel: [],
    personnelPageIndex: 0,
    personnelPageSize: 10,
    query: "",
    selectedPersonnelIds: [],

    async initialize() {
      if (get().hasInitialized || get().isLoading) {
        return
      }

      await get().loadPersonnel()
      if (!get().errorMessage) {
        set({ hasInitialized: true })
      }
    },

    async loadPersonnel() {
      set({
        errorMessage: null,
        isLoading: true,
      })

      try {
        const personnel = await personnelManagementApi.listPersonnel()
        set({
          errorMessage: null,
          notice: get().notice,
          personnel,
        })
      } catch (error) {
        set({
          errorMessage: readableError(error, "读取人员列表失败"),
          notice: null,
        })
      } finally {
        set({ isLoading: false })
      }
    },

    openCreateDialog() {
      set({
        dialogMode: "create",
        editingPersonnel: null,
        errorMessage: null,
        isDialogOpen: true,
      })
    },

    openEditDialog(personnel) {
      set({
        dialogMode: "edit",
        editingPersonnel: personnel,
        errorMessage: null,
        isDialogOpen: true,
      })
    },

    setDialogOpen(open) {
      set({
        dialogMode: open ? get().dialogMode : "create",
        editingPersonnel: open ? get().editingPersonnel : null,
        isDialogOpen: open,
      })
    },

    setPersonnelPageIndex(value) {
      set({ personnelPageIndex: Math.max(0, value) })
    },

    setPersonnelPageSize(value) {
      set({
        personnelPageIndex: 0,
        personnelPageSize: value,
      })
    },

    setQuery(value) {
      set({
        personnelPageIndex: 0,
        query: value,
        selectedPersonnelIds: [],
      })
    },

    clearFeedback() {
      set({ errorMessage: null, notice: null })
    },

    clearPersonnelSelection() {
      set({ selectedPersonnelIds: [] })
    },

    togglePersonnelSelection(personnelId) {
      set((state) => ({
        selectedPersonnelIds: state.selectedPersonnelIds.includes(personnelId)
          ? state.selectedPersonnelIds.filter((item) => item !== personnelId)
          : [...state.selectedPersonnelIds, personnelId],
      }))
    },

    toggleAllPersonnelSelection(personnelIdsOnPage) {
      if (personnelIdsOnPage.length === 0) {
        return
      }

      set((state) => {
        const allSelected = personnelIdsOnPage.every((personnelId) =>
          state.selectedPersonnelIds.includes(personnelId),
        )

        return {
          selectedPersonnelIds: allSelected
            ? state.selectedPersonnelIds.filter(
                (personnelId) => !personnelIdsOnPage.includes(personnelId),
              )
            : [
                ...new Set([
                  ...state.selectedPersonnelIds,
                  ...personnelIdsOnPage,
                ]),
              ],
        }
      })
    },

    async createPersonnelRecord(payload) {
      set({
        errorMessage: null,
        isSubmitting: true,
        notice: null,
      })

      try {
        await personnelManagementApi.createPersonnel(payload)
        const personnel = await personnelManagementApi.listPersonnel()
        markPersonnelDataChanged()

        set({
          isDialogOpen: false,
          notice: "人员已新增到人员库",
          personnel,
        })
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, "新增人员失败"),
          notice: null,
        })
        return false
      } finally {
        set({ isSubmitting: false })
      }
    },

    async updatePersonnelRecord(personnelId, payload) {
      set({
        errorMessage: null,
        isSubmitting: true,
        notice: null,
      })

      try {
        const updated = await personnelManagementApi.updatePersonnel(
          personnelId,
          payload,
        )

        if (!updated) {
          throw new Error("人员不存在")
        }

        const personnel = await personnelManagementApi.listPersonnel()
        markPersonnelDataChanged()

        set({
          editingPersonnel: updated,
          isDialogOpen: false,
          notice: "人员信息已更新",
          personnel,
        })
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, "更新人员失败"),
          notice: null,
        })
        return false
      } finally {
        set({ isSubmitting: false })
      }
    },

    async deletePersonnelRecord(personnelId) {
      set({
        errorMessage: null,
        isDeleting: true,
        notice: null,
      })

      try {
        await personnelManagementApi.deletePersonnel(personnelId)
        const personnel = await personnelManagementApi.listPersonnel()
        markPersonnelDataChanged()

        set({
          dialogMode: "create",
          editingPersonnel: null,
          isDialogOpen: false,
          notice: "人员已删除",
          personnel,
          selectedPersonnelIds: get().selectedPersonnelIds.filter(
            (item) => item !== personnelId,
          ),
        })
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, "删除人员失败"),
          notice: null,
        })
        return false
      } finally {
        set({ isDeleting: false })
      }
    },

    async deleteSelectedPersonnel() {
      const selectedPersonnelIds = get().selectedPersonnelIds

      if (selectedPersonnelIds.length === 0) {
        return false
      }

      set({
        errorMessage: null,
        isDeletingSelectedPersonnel: true,
        notice: null,
      })

      try {
        const result = await personnelManagementApi.deletePersonnelBatch(
          selectedPersonnelIds,
        )
        const personnel = await personnelManagementApi.listPersonnel()
        markPersonnelDataChanged()
        const nextTotalPages = Math.max(
          1,
          Math.ceil(personnel.length / get().personnelPageSize),
        )

        set({
          notice: `已删除 ${result.deletedCount} 名人员`,
          personnel,
          personnelPageIndex: Math.min(
            get().personnelPageIndex,
            nextTotalPages - 1,
          ),
          selectedPersonnelIds: [],
        })
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, "批量删除人员失败"),
          notice: null,
        })
        return false
      } finally {
        set({ isDeletingSelectedPersonnel: false })
      }
    },

    async importPersonnelFile() {
      set({
        errorMessage: null,
        isImporting: true,
        notice: null,
      })

      try {
        const filePath = await personnelManagementApi.pickPersonnelImportFile()
        if (!filePath) {
          return false
        }

        const result = await personnelManagementApi.importPersonnelExcel(filePath)
        const personnel = await personnelManagementApi.listPersonnel()
        markPersonnelDataChanged()

        set({
          notice: `人员导入完成：新增 ${result.createdCount}，更新 ${result.updatedCount}，跳过 ${result.skippedCount}`,
          personnel,
        })
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, "导入人员失败"),
          notice: null,
        })
        return false
      } finally {
        set({ isImporting: false })
      }
    },

    async exportPersonnelFile() {
      set({
        errorMessage: null,
        isExporting: true,
        notice: null,
      })

      try {
        const savePath = await personnelManagementApi.pickExcelExportPath(
          "人员花名册.xlsx",
        )
        if (!savePath) {
          return false
        }

        const result = await personnelManagementApi.exportPersonnelExcel(savePath)

        set({
          notice: `人员已导出到 ${result.filePath}`,
        })
        return true
      } catch (error) {
        set({
          errorMessage: readableError(error, "导出人员失败"),
          notice: null,
        })
        return false
      } finally {
        set({ isExporting: false })
      }
    },
  }),
)
