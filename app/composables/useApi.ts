import type {
  Personnel,
  CreatePersonnelInput,
  UpdatePersonnelInput,
  PersonnelImportResult,
  PayrollSheetSummary,
  CreatePayrollSheetInput,
  PayrollSheetRecordRow,
  PayrollSheetDetail,
  DeletePayrollSheetResult,
} from '~/types'

interface ApiResponse<T> {
  data: T
}

export function useApi() {
  const baseURL = '/api'

  async function request<T>(url: string, options?: Parameters<typeof $fetch>[1]): Promise<T> {
    try {
      const response = await $fetch<ApiResponse<T>>(`${baseURL}${url}`, options)
      return response.data
    } catch (error: any) {
      console.error(`API 请求失败: ${url}`, error)
      throw error
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function listPersonnel(): Promise<Personnel[]> {
    return request<Personnel[]>('/personnel')
  }

  async function getPersonnel(id: number): Promise<Personnel | null> {
    return request<Personnel | null>(`/personnel/${id}`)
  }

  async function createPersonnel(input: CreatePersonnelInput): Promise<Personnel> {
    return request<Personnel>('/personnel', {
      method: 'POST',
      body: input,
    })
  }

  async function updatePersonnel(id: number, input: UpdatePersonnelInput): Promise<Personnel | null> {
    return request<Personnel | null>(`/personnel/${id}`, {
      method: 'PUT',
      body: input,
    })
  }

  async function deletePersonnel(id: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/personnel/${id}`, {
      method: 'DELETE',
    })
  }

  async function deletePersonnelBatch(ids: number[]): Promise<{ deletedCount: number }> {
    return request<{ deletedCount: number }>('/personnel/batch-delete', {
      method: 'POST',
      body: { ids },
    })
  }

  async function reorderPersonnel(ids: number[]): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/personnel/reorder', {
      method: 'POST',
      body: { ids },
    })
  }

  async function importPersonnel(file: File): Promise<PersonnelImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    return request<PersonnelImportResult>('/personnel/import', {
      method: 'POST',
      body: formData,
    })
  }

  async function exportPersonnel(): Promise<void> {
    const blob = await $fetch<Blob>('/api/personnel/export', {
      method: 'GET',
      responseType: 'blob',
    })
    triggerDownload(blob, `人员列表_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function listPayrollSheets(): Promise<PayrollSheetSummary[]> {
    return request<PayrollSheetSummary[]>('/payroll')
  }

  async function createPayrollSheet(input: CreatePayrollSheetInput): Promise<PayrollSheetSummary> {
    return request<PayrollSheetSummary>('/payroll', {
      method: 'POST',
      body: input,
    })
  }

  async function deletePayrollSheet(id: number): Promise<DeletePayrollSheetResult> {
    return request<DeletePayrollSheetResult>(`/payroll/${id}`, {
      method: 'DELETE',
    })
  }

  async function getPayrollSheetDetail(id: number): Promise<PayrollSheetDetail | null> {
    return request<PayrollSheetDetail | null>(`/payroll/${id}`)
  }

  async function addPersonnelToSheet(sheetId: number, personnelIds: number[], netPay?: number): Promise<any> {
    if (typeof netPay === 'number') {
      return request<any>(`/payroll/${sheetId}/add-personnel-with-pay`, {
        method: 'POST',
        body: { personnelIds, netPay },
      })
    }
    return request<any>(`/payroll/${sheetId}/add-personnel`, {
      method: 'POST',
      body: { personnelIds },
    })
  }

  async function removePersonnelFromSheet(sheetId: number, personnelIds: number[]): Promise<any> {
    return request<any>(`/payroll/${sheetId}/remove-personnel`, {
      method: 'POST',
      body: { personnelIds },
    })
  }

  async function updatePayrollRecordNetPay(recordId: number, netPay: number): Promise<PayrollSheetRecordRow | null> {
    return request<PayrollSheetRecordRow | null>(`/payroll/record/${recordId}/update-net-pay`, {
      method: 'PUT',
      body: { netPay },
    })
  }

  async function updatePayrollRecordExportWeight(recordId: number, exportWeight: number | null): Promise<PayrollSheetRecordRow | null> {
    return request<PayrollSheetRecordRow | null>(`/payroll/record/${recordId}/update-export-weight`, {
      method: 'PUT',
      body: { exportWeight },
    })
  }

  async function exportPayrollSheet(id: number): Promise<void> {
    const blob = await $fetch<Blob>(`/api/payroll/${id}/export`, {
      method: 'GET',
      responseType: 'blob',
    })
    triggerDownload(blob, `工资表_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return {
    listPersonnel,
    getPersonnel,
    createPersonnel,
    updatePersonnel,
    deletePersonnel,
    deletePersonnelBatch,
    reorderPersonnel,
    importPersonnel,
    exportPersonnel,
    listPayrollSheets,
    createPayrollSheet,
    deletePayrollSheet,
    getPayrollSheetDetail,
    addPersonnelToSheet,
    removePersonnelFromSheet,
    updatePayrollRecordNetPay,
    updatePayrollRecordExportWeight,
    exportPayrollSheet,
  }
}
