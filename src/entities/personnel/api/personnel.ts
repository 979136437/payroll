import { invoke } from "@tauri-apps/api/core"

export type Personnel = {
  id: number
  name: string
  jobType: string | null
  phoneNumber: string | null
}

export type CreatePersonnelPayload = {
  name: string
  jobType?: string | null
  phoneNumber?: string | null
}

export async function listPersonnel() {
  return invoke<Personnel[]>("list_personnel_command")
}

export async function createPersonnel(payload: CreatePersonnelPayload) {
  return invoke<Personnel>("create_personnel_command", { payload })
}
