import type {
  Personnel,
  CreatePersonnelInput,
  UpdatePersonnelInput,
  DeletePersonnelBatchResult,
  PersonnelImportResult,
  PayrollSheetSummary,
  CreatePayrollSheetInput,
  PayrollSheetDetail,
  PayrollSheetRecordRow,
  DeletePayrollSheetResult,
} from "./types";

const apiBase = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败: ${res.status}`);
  }

  return res.json();
}

export const personnelApi = {
  list: () => request<Personnel[]>("/personnel"),
  create: (data: CreatePersonnelInput) =>
    request<Personnel>("/personnel", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: number) => request<Personnel>(`/personnel/${id}`),
  update: (id: number, data: UpdatePersonnelInput) =>
    request<Personnel>(`/personnel/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ success: boolean }>(`/personnel/${id}`, {
      method: "DELETE",
    }),
  batchDelete: (ids: number[]) =>
    request<DeletePersonnelBatchResult>("/personnel/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  reorder: (orderedIds: number[]) =>
    request<{ success: boolean }>("/personnel/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    }),
  importExcel: async (file: File): Promise<PersonnelImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${apiBase}/personnel/import`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "导入失败");
    }
    return res.json();
  },
  exportExcel: () => `${apiBase}/personnel/export`,
};

export const payrollApi = {
  list: () => request<PayrollSheetSummary[]>("/payroll"),
  create: (data: CreatePayrollSheetInput) =>
    request<PayrollSheetSummary>("/payroll", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: number) => request<PayrollSheetDetail>(`/payroll/${id}`),
  delete: (id: number) =>
    request<DeletePayrollSheetResult>(`/payroll/${id}`, {
      method: "DELETE",
    }),
  addPersonnel: (sheetId: number, personnelIds: number[]) =>
    request<{ success: boolean }>(`/payroll/${sheetId}/personnel`, {
      method: "POST",
      body: JSON.stringify({ personnelIds }),
    }),
  removePersonnel: (sheetId: number, personnelIds: number[]) =>
    request<{ success: boolean }>(`/payroll/${sheetId}/personnel`, {
      method: "DELETE",
      body: JSON.stringify({ personnelIds }),
    }),
  updateNetPay: (recordId: number, netPay: number) =>
    request<PayrollSheetRecordRow>(`/payroll/record/${recordId}/net-pay`, {
      method: "PUT",
      body: JSON.stringify({ netPay }),
    }),
  updateExportWeight: (recordId: number, exportWeight: number | null) =>
    request<PayrollSheetRecordRow>(
      `/payroll/record/${recordId}/export-weight`,
      {
        method: "PUT",
        body: JSON.stringify({ exportWeight }),
      }
    ),
  exportExcel: (sheetId: number) => `${apiBase}/payroll/${sheetId}/export`,
};
