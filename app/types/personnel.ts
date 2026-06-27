export interface PersonnelSummary {
  id: number
  name: string
  gender: string | null
  ethnicity: string | null
  nativePlace: string | null
  idCardNumber: string | null
  payrollCardNumber: string | null
  bankName: string | null
  jobType: string | null
  startDate: string | null
  endDate: string | null
  phoneNumber: string | null
  remark: string | null
}

export interface CreatePersonnelInput {
  name: string
  gender?: string | null
  ethnicity?: string | null
  nativePlace?: string | null
  idCardNumber?: string | null
  payrollCardNumber?: string | null
  bankName?: string | null
  jobType?: string | null
  startDate?: string | null
  endDate?: string | null
  phoneNumber?: string | null
  remark?: string | null
}

export type UpdatePersonnelInput = Partial<CreatePersonnelInput>
