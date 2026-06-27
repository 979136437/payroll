import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import type { PayrollSheetSummary } from "@/entities/payroll-sheet/api/payroll-sheet"
import {
  createPayrollSheetSchema,
  type CreatePayrollSheetValues,
} from "@/features/create-payroll-sheet/model/schema"
import { ModalShell } from "@/shared/ui/modal-shell"
import { SelectField } from "@/shared/ui/select-field"
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
  const selectedSourceSheetId =
    useWatch({
      control: form.control,
      name: "sourceSheetId",
    }) ?? ""
  const sourceOptions = sheets.map((sheet) => ({
    description: `${sheet.personnelCount} 人`,
    label: sheet.name,
    value: String(sheet.id),
  }))

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
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="submit" form="create-payroll-sheet-form" disabled={isBusy}>
            创建工资表
          </Button>
        </div>
      }
    >
      <form
        id="create-payroll-sheet-form"
        className="space-y-5"
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
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            placeholder="例如：2026 年 5 月工资表"
          />
        </Field>
        <Field label="从往期导入人员">
          <SelectField
            emptyText="暂无可复制的历史工资表"
            onChange={(nextValue) => form.setValue("sourceSheetId", nextValue)}
            options={[
              {
                description: "直接创建空白工资表",
                label: "不导入，创建空表",
                value: "",
              },
              ...sourceOptions,
            ]}
            placeholder="不导入，创建空表"
            value={selectedSourceSheetId}
          />
        </Field>
      </form>
    </ModalShell>
  )
}
