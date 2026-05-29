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
  pickerSelectionSet: ReadonlySet<number>
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
  pickerSelectionSet,
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
      title="从人员库添加"
      description="可以先多选已有人员，也可以顺手新增一个基础人员。"
      wide
    >
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-950">人员库</p>
              <p className="text-xs text-muted-foreground">
                已在当前工资表中的人员会显示为不可重复加入。
              </p>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              已选 {pickerSelection.length} 人
            </div>
          </div>

          <div className="max-h-[24rem] space-y-2 overflow-y-auto rounded-3xl border border-border/70 bg-secondary/20 p-3">
            {personnel.length > 0 ? (
              personnel.map((person) => {
                const disabled = currentSheetPersonIds.has(person.id)
                const checked = pickerSelectionSet.has(person.id) || disabled

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
                            已在当前工资表
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <BriefcaseBusiness className="size-3.5" />
                          {person.jobType || "未填工种"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3.5" />
                          {person.phoneNumber || "未填电话"}
                        </span>
                      </div>
                    </div>
                  </label>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                人员库还是空的，先在右侧新增一个基础人员。
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
            <Button
              type="button"
              disabled={pickerSelection.length === 0 || isBusy}
              onClick={() => void onAddSelected()}
            >
              加入当前工资表
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
            <p className="text-sm font-medium text-slate-950">手工新增人员</p>
            <p className="text-xs leading-5 text-muted-foreground">
              第一版只收最基础信息，后面可以继续补完整人员资料。
            </p>
          </div>
          <Field label="姓名" error={form.formState.errors.name?.message}>
            <input
              {...form.register("name")}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
              placeholder="例如：张三"
            />
          </Field>
          <Field label="工种">
            <input
              {...form.register("jobType")}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
              placeholder="例如：瓦工"
            />
          </Field>
          <Field label="电话">
            <input
              {...form.register("phoneNumber")}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-ring/40"
              placeholder="例如：13800000000"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isBusy}>
            <Plus className="size-4" />
            新增到人员库
          </Button>
        </form>
      </div>
    </ModalShell>
  )
}
