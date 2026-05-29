import { z } from "zod"

export const createPersonnelSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名"),
  jobType: z.string().optional(),
  phoneNumber: z.string().optional(),
})

export type CreatePersonnelValues = z.infer<typeof createPersonnelSchema>
