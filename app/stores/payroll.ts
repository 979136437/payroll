import { defineStore } from 'pinia'
import type {
  PayrollSheetSummary,
  CreatePayrollSheetInput,
  PayrollSheetDetail,
  PayrollSheetRecordRow,
  DeletePayrollSheetResult,
} from '~/types'

export const usePayrollStore = defineStore('payroll', {
  state: () => ({
    sheets: [] as PayrollSheetSummary[],
    currentSheetId: null as number | null,
    currentDetail: null as PayrollSheetDetail | null,
    loading: false,
    detailLoading: false,
    error: null as string | null,
    createDialogOpen: false,
    isCreating: false,
    personnelPickerOpen: false,
    isAddingPersonnel: false,
    deleteConfirmOpen: false,
    pendingDeleteSheet: null as PayrollSheetSummary | null,
    isDeleting: false,
  }),

  getters: {
    currentSheet(state): PayrollSheetSummary | null {
      if (!state.currentSheetId) return null
      return state.sheets.find((s) => s.id === state.currentSheetId) || null
    },
  },

  actions: {
    async fetchSheets() {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<{ data: PayrollSheetSummary[] }>('/api/payroll')
        this.sheets = response.data
        return response.data
      } catch (err: any) {
        this.error = err.message || '获取工资表列表失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async createSheet(name: string, sourceSheetId?: number) {
      this.isCreating = true
      this.error = null
      try {
        const body: CreatePayrollSheetInput = { name }
        if (sourceSheetId !== undefined) {
          body.sourceSheetId = sourceSheetId
        }
        const response = await $fetch<{ data: PayrollSheetSummary }>('/api/payroll', {
          method: 'POST',
          body,
        })
        this.sheets.unshift(response.data)
        return response.data
      } catch (err: any) {
        this.error = err.message || '创建工资表失败'
        throw err
      } finally {
        this.isCreating = false
      }
    },

    async deleteSheet(id: number) {
      this.isDeleting = true
      this.error = null
      try {
        const response = await $fetch<{ data: DeletePayrollSheetResult }>(`/api/payroll/${id}`, {
          method: 'DELETE',
        })
        if (response.data.deleted) {
          this.sheets = this.sheets.filter((s) => s.id !== id)
          if (this.currentSheetId === id) {
            this.currentSheetId = null
            this.currentDetail = null
          }
        }
        return response.data
      } catch (err: any) {
        this.error = err.message || '删除工资表失败'
        throw err
      } finally {
        this.isDeleting = false
      }
    },

    async selectSheet(id: number) {
      this.currentSheetId = id
      await this.fetchDetail(id)
    },

    async fetchDetail(id: number) {
      this.detailLoading = true
      this.error = null
      try {
        const response = await $fetch<{ data: PayrollSheetDetail }>(`/api/payroll/${id}`)
        this.currentDetail = response.data
        return response.data
      } catch (err: any) {
        this.error = err.message || '获取工资表明细失败'
        throw err
      } finally {
        this.detailLoading = false
      }
    },

    async addPersonnelToSheet(personnelIds: number[], netPay?: number) {
      if (!this.currentSheetId) return
      this.isAddingPersonnel = true
      this.error = null
      try {
        const body: { personnelIds: number[]; netPay?: number } = { personnelIds }
        if (netPay !== undefined) {
          body.netPay = netPay
        }
        await $fetch(`/api/payroll/${this.currentSheetId}/add-personnel`, {
          method: 'POST',
          body,
        })
        await this.fetchDetail(this.currentSheetId)
        await this.fetchSheets()
      } catch (err: any) {
        this.error = err.message || '添加人员失败'
        throw err
      } finally {
        this.isAddingPersonnel = false
      }
    },

    async removePersonnelFromSheet(personnelIds: number[]) {
      if (!this.currentSheetId) return
      this.loading = true
      this.error = null
      try {
        await $fetch(`/api/payroll/${this.currentSheetId}/remove-personnel`, {
          method: 'POST',
          body: { personnelIds },
        })
        await this.fetchDetail(this.currentSheetId)
        await this.fetchSheets()
      } catch (err: any) {
        this.error = err.message || '移除人员失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateRecordNetPay(recordId: number, netPay: number) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<{ data: PayrollSheetRecordRow }>(
          `/api/payroll/record/${recordId}/net-pay`,
          {
            method: 'PUT',
            body: { netPay },
          },
        )
        if (this.currentDetail) {
          const index = this.currentDetail.records.findIndex((r) => r.recordId === recordId)
          if (index !== -1) {
            this.currentDetail.records[index] = response.data
          }
          const totalNetPay = this.currentDetail.records.reduce(
            (sum, r) => sum + (r.netPay || 0),
            0,
          )
          this.currentDetail.sheet.totalNetPay = totalNetPay
          const sheetIndex = this.sheets.findIndex((s) => s.id === this.currentDetail!.sheet.id)
          if (sheetIndex !== -1) {
            this.sheets[sheetIndex].totalNetPay = totalNetPay
          }
        }
        return response.data
      } catch (err: any) {
        this.error = err.message || '更新实发工资失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateRecordExportWeight(recordId: number, exportWeight: number | null) {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<{ data: PayrollSheetRecordRow }>(
          `/api/payroll/record/${recordId}/export-weight`,
          {
            method: 'PUT',
            body: { exportWeight },
          },
        )
        if (this.currentDetail) {
          const index = this.currentDetail.records.findIndex((r) => r.recordId === recordId)
          if (index !== -1) {
            this.currentDetail.records[index] = response.data
          }
        }
        return response.data
      } catch (err: any) {
        this.error = err.message || '更新外运重量失败'
        throw err
      } finally {
        this.loading = false
      }
    },

    async exportSheet(id: number) {
      this.loading = true
      this.error = null
      try {
        const blob = await $fetch<Blob>(`/api/payroll/${id}/export`, {
          method: 'GET',
          responseType: 'blob',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `工资表_${new Date().toISOString().slice(0, 10)}.xlsx`
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

    openCreateDialog() {
      this.createDialogOpen = true
    },

    closeCreateDialog() {
      this.createDialogOpen = false
    },

    openPersonnelPicker() {
      this.personnelPickerOpen = true
    },

    closePersonnelPicker() {
      this.personnelPickerOpen = false
    },

    openDeleteConfirm(sheet: PayrollSheetSummary) {
      this.pendingDeleteSheet = sheet
      this.deleteConfirmOpen = true
    },

    closeDeleteConfirm() {
      this.deleteConfirmOpen = false
      this.pendingDeleteSheet = null
    },
  },
})
