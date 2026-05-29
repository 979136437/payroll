import { z } from "zod"

export const createPayrollSheetSchema = z.object({
  name: z.string().trim().min(1, "请输入工资表名称"),
  sourceSheetId: z.string().optional(),
})

export type CreatePayrollSheetValues = z.infer<typeof createPayrollSheetSchema>
