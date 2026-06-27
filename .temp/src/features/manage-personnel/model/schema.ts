import { z } from "zod"

export const createPersonnelSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名"),
  gender: z.union([z.enum(["男", "女"]), z.literal("")]).optional(),
  ethnicity: z.string().optional(),
  nativePlace: z.string().optional(),
  idCardNumber: z.string().optional(),
  payrollCardNumber: z.string().optional(),
  bankName: z.string().optional(),
  phoneNumber: z.string().optional(),
})

export type CreatePersonnelValues = z.infer<typeof createPersonnelSchema>
