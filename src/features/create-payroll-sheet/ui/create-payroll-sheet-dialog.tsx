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

const COPY = {
  cancel: "\u53d6\u6d88",
  create: "\u521b\u5efa\u5de5\u8d44\u8868",
  description:
    "\u53ef\u4ee5\u4ece\u7a7a\u8868\u5f00\u59cb\uff0c\u4e5f\u53ef\u4ee5\u590d\u5236\u5f80\u671f\u4eba\u5458\u540d\u5355\u3002",
  emptySource: "\u4e0d\u5bfc\u5165\uff0c\u521b\u5efa\u7a7a\u8868",
  nameLabel: "\u5de5\u8d44\u8868\u540d\u79f0",
  namePlaceholder: "\u4f8b\u5982\uff1a2026 \u5e74 5 \u6708\u5de5\u8d44\u8868",
  sourceLabel: "\u4ece\u5f80\u671f\u5bfc\u5165\u4eba\u5458",
  title: "\u65b0\u5efa\u5de5\u8d44\u8868",
}

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
      title={COPY.title}
      description={COPY.description}
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
        <Field label={COPY.nameLabel} error={form.formState.errors.name?.message}>
          <input
            {...form.register("name")}
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
            placeholder={COPY.namePlaceholder}
          />
        </Field>
        <Field label={COPY.sourceLabel}>
          <select
            {...form.register("sourceSheetId")}
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
          >
            <option value="">{COPY.emptySource}</option>
            {sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name} ({sheet.personnelCount} \u4eba)
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
            {COPY.cancel}
          </Button>
          <Button type="submit" disabled={isBusy}>
            {COPY.create}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
