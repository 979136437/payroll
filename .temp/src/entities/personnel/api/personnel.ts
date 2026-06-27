import { invoke } from "@tauri-apps/api/core"

export type PersonnelImportResult = {
  createdCount: number
  updatedCount: number
  skippedCount: number
  errors: string[]
}

export type ExcelExportResult = {
  filePath: string
}

export type DeletePersonnelBatchResult = {
  deletedCount: number
}

export type Personnel = {
  id: number
  name: string
  gender: string | null
  ethnicity: string | null
  nativePlace: string | null
  idCardNumber: string | null
  payrollCardNumber: string | null
  bankName: string | null
  jobType: string | null
  phoneNumber: string | null
}

export type CreatePersonnelPayload = {
  name: string
  gender?: string | null
  ethnicity?: string | null
  nativePlace?: string | null
  idCardNumber?: string | null
  payrollCardNumber?: string | null
  bankName?: string | null
  phoneNumber?: string | null
}

export type UpdatePersonnelPayload = {
  name: string
  gender?: string | null
  ethnicity?: string | null
  nativePlace?: string | null
  idCardNumber?: string | null
  payrollCardNumber?: string | null
  bankName?: string | null
  phoneNumber?: string | null
}

export async function listPersonnel() {
  return invoke<Personnel[]>("list_personnel_command")
}

export async function createPersonnel(payload: CreatePersonnelPayload) {
  return invoke<Personnel>("create_personnel_command", { payload })
}

export async function updatePersonnel(
  personnelId: number,
  payload: UpdatePersonnelPayload,
) {
  return invoke<Personnel | null>("update_personnel_command", {
    payload,
    personnelId,
  })
}

export async function deletePersonnel(personnelId: number) {
  return invoke<void>("delete_personnel_command", {
    personnelId,
  })
}

export async function deletePersonnelBatch(personnelIds: number[]) {
  return invoke<DeletePersonnelBatchResult>("delete_personnel_batch_command", {
    personnelIds,
  })
}

export async function pickPersonnelImportFile() {
  return invoke<string | null>("pick_personnel_import_file_command")
}

export async function pickExcelExportPath(defaultFileName: string) {
  return invoke<string | null>("pick_excel_export_path_command", {
    defaultFileName,
  })
}

export async function importPersonnelExcel(filePath: string) {
  return invoke<PersonnelImportResult>("import_personnel_excel_command", {
    filePath,
  })
}

export async function exportPersonnelExcel(savePath: string) {
  return invoke<ExcelExportResult>("export_personnel_excel_command", {
    savePath,
  })
}
