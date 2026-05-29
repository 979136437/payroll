import { zodResolver } from "@hookform/resolvers/zod"
import { BriefcaseBusiness, Phone, Plus } from "lucide-react"
import { useForm } from "react-hook-form"

import type { Personnel } from "@/entities/personnel/api/personnel"
import {
  createPersonnelSchema,
  type CreatePersonnelValues,
} from "@/features/manage-personnel/model/schema"
import { ModalShell } from "@/shared/ui/modal-shell"
import { Field } from "@/shared/ui/workspace-primitives"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const COPY = {
  addToSheet: "\u52a0\u5165\u5f53\u524d\u5de5\u8d44\u8868",
  addedCount: "\u5df2\u9009",
  close: "\u5173\u95ed",
  currentSheetOnly:
    "\u5df2\u5728\u5f53\u524d\u5de5\u8d44\u8868\u4e2d\u7684\u4eba\u5458\u4f1a\u663e\u793a\u4e3a\u4e0d\u53ef\u91cd\u590d\u52a0\u5165\u3002",
  description:
    "\u53ef\u4ee5\u5148\u591a\u9009\u5df2\u6709\u4eba\u5458\uff0c\u4e5f\u53ef\u4ee5\u987a\u624b\u65b0\u589e\u4e00\u4e2a\u57fa\u7840\u4eba\u5458\u3002",
  disabledBadge: "\u5df2\u5728\u5f53\u524d\u5de5\u8d44\u8868",
  emptyJobType: "\u672a\u586b\u5de5\u79cd",
  emptyPhone: "\u672a\u586b\u7535\u8bdd",
  emptyPersonnel:
    "\u4eba\u5458\u5e93\u8fd8\u662f\u7a7a\u7684\uff0c\u5148\u5728\u53f3\u4fa7\u65b0\u589e\u4e00\u4e2a\u57fa\u7840\u4eba\u5458\u3002",
  helpText:
    "\u7b2c\u4e00\u7248\u53ea\u6536\u6700\u57fa\u7840\u4fe1\u606f\uff0c\u540e\u9762\u53ef\u4ee5\u7ee7\u7eed\u8865\u5b8c\u6574\u4eba\u5458\u8d44\u6599\u3002",
  jobTypeLabel: "\u5de5\u79cd",
  jobTypePlaceholder: "\u4f8b\u5982\uff1a\u74e6\u5de5",
  manualCreate: "\u624b\u5de5\u65b0\u589e\u4eba\u5458",
  nameLabel: "\u59d3\u540d",
  namePlaceholder: "\u4f8b\u5982\uff1a\u5f20\u4e09",
  personnelLibrary: "\u4eba\u5458\u5e93",
  phoneLabel: "\u7535\u8bdd",
  phonePlaceholder: "\u4f8b\u5982\uff1a13800000000",
  pickerTitle: "\u4ece\u4eba\u5458\u5e93\u6dfb\u52a0",
  submitCreate: "\u65b0\u589e\u5230\u4eba\u5458\u5e93",
}

type PersonnelPickerDialogProps = {
  currentSheetPersonIds: Set<number>
  isBusy: boolean
  onAddSelected: () => Promise<void>
  onCreatePersonnel: (values: CreatePersonnelValues) => Promise<boolean>
  onOpenChange: (open: boolean) => void
  onToggleSelection: (personnelId: number) => void
  open: boolean
  personnel: Personnel[]
  pickerSelection: number[]
}

export function PersonnelPickerDialog({
  currentSheetPersonIds,
  isBusy,
  onAddSelected,
  onCreatePersonnel,
  onOpenChange,
  onToggleSelection,
  open,
  personnel,
  pickerSelection,
}: PersonnelPickerDialogProps) {
  const form = useForm<CreatePersonnelValues>({
    resolver: zodResolver(createPersonnelSchema),
    defaultValues: {
      name: "",
      jobType: "",
      phoneNumber: "",
    },
  })

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={COPY.pickerTitle}
      description={COPY.description}
      wide
    >
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-950">
                {COPY.personnelLibrary}
              </p>
              <p className="text-xs text-muted-foreground">
                {COPY.currentSheetOnly}
              </p>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {COPY.addedCount} {pickerSelection.length} \u4eba
            </div>
          </div>

          <div className="max-h-[24rem] space-y-2 overflow-y-auto rounded-3xl border border-border/70 bg-secondary/20 p-3">
            {personnel.length > 0 ? (
              personnel.map((person) => {
                const disabled = currentSheetPersonIds.has(person.id)
                const checked = pickerSelection.includes(person.id) || disabled

                return (
                  <label
                    key={person.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-3 py-3 transition",
                      disabled
                        ? "border-border/60 bg-muted/45 text-muted-foreground"
                        : "border-border/60 bg-white/80 hover:border-primary/35 hover:bg-white",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggleSelection(person.id)}
                      className="mt-1 size-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-950">
                          {person.name}
                        </p>
                        {disabled ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                            {COPY.disabledBadge}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <BriefcaseBusiness className="size-3.5" />
                          {person.jobType || COPY.emptyJobType}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3.5" />
                          {person.phoneNumber || COPY.emptyPhone}
                        </span>
                      </div>
                    </div>
                  </label>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {COPY.emptyPersonnel}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {COPY.close}
            </Button>
            <Button
              type="button"
              disabled={pickerSelection.length === 0 || isBusy}
              onClick={() => void onAddSelected()}
            >
              {COPY.addToSheet}
            </Button>
          </div>
        </div>

        <form
          className="space-y-4 rounded-3xl border border-border/70 bg-white/75 p-4"
          onSubmit={form.handleSubmit(async (values) => {
            const didCreate = await onCreatePersonnel(values)
            if (didCreate) {
              form.reset()
            }
          })}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-950">
              {COPY.manualCreate}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {COPY.helpText}
            </p>
          </div>
          <Field label={COPY.nameLabel} error={form.formState.errors.name?.message}>
            <input
              {...form.register("name")}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
              placeholder={COPY.namePlaceholder}
            />
          </Field>
          <Field label={COPY.jobTypeLabel}>
            <input
              {...form.register("jobType")}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
              placeholder={COPY.jobTypePlaceholder}
            />
          </Field>
          <Field label={COPY.phoneLabel}>
            <input
              {...form.register("phoneNumber")}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
              placeholder={COPY.phonePlaceholder}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isBusy}>
            <Plus className="size-4" />
            {COPY.submitCreate}
          </Button>
        </form>
      </div>
    </ModalShell>
  )
}
