import { invoke } from "@tauri-apps/api/core"

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
