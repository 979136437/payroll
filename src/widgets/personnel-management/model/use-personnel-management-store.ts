import { create } from "zustand"

import type {
  CreatePersonnelPayload,
  Personnel,
  UpdatePersonnelPayload,
} from "@/entities/personnel/api/personnel"
import { readableError } from "@/shared/lib/formatters"
import { personnelManagementApi } from "@/widgets/personnel-management/model/personnel-management-api"

type PersonnelDialogMode = "create" | "edit"

type PersonnelManagementStore = {
  dialogMode: PersonnelDialogMode
  editingPersonnel: Personnel | null
  errorMessage: string | null
  hasInitialized: boolean
  isDialogOpen: boolean
  isLoading: boolean
  isSubmitting: boolean
  notice: string | null
  personnel: Personnel[]
  query: string
  clearFeedback: () => void
  createPersonnelRecord: (payload: CreatePersonnelPayload) => Promise<boolean>
  initialize: () => Promise<void>
  loadPersonnel: () => Promise<void>
  openCreateDialog: () => void
  openEditDialog: (personnel: Personnel) => void
  setDialogOpen: (open: boolean) => void
  setQuery: (value: string) => void
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
    isDialogOpen: false,
    isLoading: false,
    isSubmitting: false,
    notice: null,
    personnel: [],
    query: "",

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

    setQuery(value) {
      set({ query: value })
    },

    clearFeedback() {
      set({ errorMessage: null, notice: null })
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
        const personnel = await personnelManagementApi.listPersonnel()

        set({
          editingPersonnel: updated ?? null,
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
  }),
)
