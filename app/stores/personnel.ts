import { defineStore } from 'pinia'
import type { Personnel, CreatePersonnelInput, UpdatePersonnelInput } from '~/types'

export const usePersonnelStore = defineStore('personnel', {
  state: () => ({
    personnel: [] as Personnel[],
    loading: false,
    error: null as string | null,
    selectedIds: [] as number[],
    query: '',
    pageIndex: 1,
    pageSize: 20,
    dialogOpen: false,
    dialogMode: 'create' as 'create' | 'edit',
    editingPersonnel: null as Personnel | null,
    isSubmitting: false,
    deleteConfirmOpen: false,
    pendingDeletePersonnel: null as Personnel | null,
    batchDeleteConfirmOpen: false,
    isDeleting: false,
  }),

  getters: {
    filteredPersonnel(state): Personnel[] {
      if (!state.query) return state.personnel
      const q = state.query.toLowerCase()
      return state.personnel.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.idCardNumber?.toLowerCase().includes(q) ||
          p.payrollCardNumber?.toLowerCase().includes(q) ||
          p.phoneNumber?.toLowerCase().includes(q),
      )
    },

    paginatedPersonnel(state, getters): Personnel[] {
      const start = (state.pageIndex - 1) * state.pageSize
      const end = start + state.pageSize
      return getters.filteredPersonnel.slice(start, end)
    },

    totalPages(state, getters): number {
      return Math.ceil(getters.filteredPersonnel.length / state.pageSize) || 1
    },

    selectedSet(state): Set<number> {
      return new Set(state.selectedIds)
    },

    isAllSelected(state, getters): boolean {
      const list = getters.filteredPersonnel as Personnel[]
      if (list.length === 0) return false
      return list.every((p) => state.selectedIds.includes(p.id))
    },
  },

  actions: {
    async fetchPersonnel() {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<Personnel[]>('/api/personnel')
        this.personnel = data
      } catch (err: any) {
        this.error = err.message || '获取人员列表失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async createPersonnel(data: CreatePersonnelInput) {
      this.isSubmitting = true
      this.error = null
      try {
        const created = await $fetch<Personnel>('/api/personnel', {
          method: 'POST',
          body: data,
        })
        this.personnel.push(created)
        return created
      } catch (err: any) {
        this.error = err.message || '创建人员失败'
        throw err
      } finally {
        this.isSubmitting = false
      }
    },

    async updatePersonnel(id: number, data: UpdatePersonnelInput) {
      this.isSubmitting = true
      this.error = null
      try {
        const updated = await $fetch<Personnel>(`/api/personnel/${id}`, {
          method: 'PUT',
          body: data,
        })
        const index = this.personnel.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.personnel[index] = updated
        }
        return updated
      } catch (err: any) {
        this.error = err.message || '更新人员失败'
        throw err
      } finally {
        this.isSubmitting = false
      }
    },

    async deletePersonnel(id: number) {
      this.isDeleting = true
      this.error = null
      try {
        await $fetch(`/api/personnel/${id}`, {
          method: 'DELETE',
        })
        this.personnel = this.personnel.filter((p) => p.id !== id)
        this.selectedIds = this.selectedIds.filter((sid) => sid !== id)
      } catch (err: any) {
        this.error = err.message || '删除人员失败'
        throw err
      } finally {
        this.isDeleting = false
      }
    },

    async deleteSelected() {
      if (this.selectedIds.length === 0) return
      this.isDeleting = true
      this.error = null
      try {
        await $fetch('/api/personnel/batch-delete', {
          method: 'POST',
          body: { ids: this.selectedIds },
        })
        this.personnel = this.personnel.filter((p) => !this.selectedIds.includes(p.id))
        this.selectedIds = []
      } catch (err: any) {
        this.error = err.message || '批量删除失败'
        throw err
      } finally {
        this.isDeleting = false
      }
    },

    async importExcel(file: File) {
      this.loading = true
      this.error = null
      try {
        const formData = new FormData()
        formData.append('file', file)
        const result = await $fetch<{ count: number }>('/api/personnel/import', {
          method: 'POST',
          body: formData,
        })
        await this.fetchPersonnel()
        return result
      } catch (err: any) {
        this.error = err.message || '导入失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async exportExcel() {
      this.loading = true
      this.error = null
      try {
        const blob = await $fetch<Blob>('/api/personnel/export', {
          method: 'GET',
          responseType: 'blob',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `人员列表_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err: any) {
        this.error = err.message || '导出失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    toggleSelect(id: number) {
      const index = this.selectedIds.indexOf(id)
      if (index === -1) {
        this.selectedIds.push(id)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    toggleSelectAll() {
      const filtered = this.filteredPersonnel as Personnel[]
      if (this.isAllSelected) {
        const filteredIds = new Set(filtered.map((p) => p.id))
        this.selectedIds = this.selectedIds.filter((id) => !filteredIds.has(id))
      } else {
        const selectedSet = new Set(this.selectedIds)
        for (const p of filtered) {
          if (!selectedSet.has(p.id)) {
            this.selectedIds.push(p.id)
          }
        }
      }
    },

    clearSelection() {
      this.selectedIds = []
    },

    setQuery(query: string) {
      this.query = query
      this.pageIndex = 1
    },

    setPageIndex(pageIndex: number) {
      this.pageIndex = Math.max(1, pageIndex)
    },

    setPageSize(pageSize: number) {
      this.pageSize = Math.max(1, pageSize)
      this.pageIndex = 1
    },

    openCreateDialog() {
      this.dialogMode = 'create'
      this.editingPersonnel = null
      this.dialogOpen = true
    },

    openEditDialog(personnel: Personnel) {
      this.dialogMode = 'edit'
      this.editingPersonnel = { ...personnel }
      this.dialogOpen = true
    },

    closeDialog() {
      this.dialogOpen = false
      this.editingPersonnel = null
    },

    openDeleteConfirm(personnel: Personnel) {
      this.pendingDeletePersonnel = personnel
      this.deleteConfirmOpen = true
    },

    closeDeleteConfirm() {
      this.deleteConfirmOpen = false
      this.pendingDeletePersonnel = null
    },

    openBatchDeleteConfirm() {
      this.batchDeleteConfirmOpen = true
    },

    closeBatchDeleteConfirm() {
      this.batchDeleteConfirmOpen = false
    },
  },
})
