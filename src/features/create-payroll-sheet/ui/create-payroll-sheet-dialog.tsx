import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import type { PayrollSheetSummary } from "@/entities/payroll-sheet/api/payroll-sheet"
import {
  createPayrollSheetSchema,
  type CreatePayrollSheetValues,
} from "@/features/create-payroll-sheet/model/schema"
import { ModalShell } from "@/shared/ui/modal-shell"
import { Field } from "@/shared/ui/workspace-primitives"
import { Button } from "@/components/ui/button"

type CreatePayrollSheetDialogProps = {
  isBusy: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreatePayrollSheetValues) => Promise<boolean>
  open: boolean
  sheets: PayrollSheetSummary[]
}

export function CreatePayrollSheetDialog({
  isBusy,
  onOpenChange,
  onSubmit,
  open,
  sheets,
}: CreatePayrollSheetDialogProps) {
  const form = useForm<CreatePayrollSheetValues>({
    resolver: zodResolver(createPayrollSheetSchema),
    defaultValues: {
      name: "",
      sourceSheetId: "",
    },
  })

  return (
    <ModalShell
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset()
        }
        onOpenChange(nextOpen)
      }}
      title="新建工资表"
      description="可以从空表开始，也可以复制往期人员名单。"
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          const didSubmit = await onSubmit(values)
          if (didSubmit) {
            form.reset()
          }
        })}
      >
        <Field label="工资表名称" error={form.formState.errors.name?.message}>
          <input
            {...form.register("name")}
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
            placeholder="例如：2026 年 5 月工资表"
          />
        </Field>
        <Field label="从往期导入人员">
          <select
            {...form.register("sourceSheetId")}
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
          >
            <option value="">不导入，创建空表</option>
            {sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name}（{sheet.personnelCount} 人）
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="submit" disabled={isBusy}>
            创建工资表
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
