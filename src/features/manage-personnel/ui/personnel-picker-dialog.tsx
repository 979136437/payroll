import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Phone, Plus, UserRound } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import type { Personnel } from "@/entities/personnel/api/personnel"
import {
  createPersonnelSchema,
  type CreatePersonnelValues,
} from "@/features/manage-personnel/model/schema"
import { PersonnelFormFields } from "@/features/manage-personnel/ui/personnel-form-fields"
import { cn } from "@/lib/utils"
import { ModalShell } from "@/shared/ui/modal-shell"

type PersonnelPickerDialogProps = {
  currentSheetPersonIds: Set<number>
  isBusy: boolean
  onAddSelected: () => Promise<void>
  onCreatePersonnel: (values: CreatePersonnelValues) => Promise<boolean>
  onOpenChange: (open: boolean) => void
  onToggleAllSelection: () => void
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
  onToggleAllSelection,
  onToggleSelection,
  open,
  personnel,
  pickerSelection,
  pickerSelectionSet,
}: PersonnelPickerDialogProps) {
  const form = useForm<CreatePersonnelValues>({
    resolver: zodResolver(createPersonnelSchema),
    defaultValues: {
      bankName: "",
      ethnicity: "",
      gender: "",
      idCardNumber: "",
      name: "",
      nativePlace: "",
      payrollCardNumber: "",
      phoneNumber: "",
    },
  })

  const selectedGender =
    useWatch({
      control: form.control,
      name: "gender",
    }) ?? ""

  const availablePersonnel = personnel.filter(
    (person) => !currentSheetPersonIds.has(person.id),
  )
  const allAvailableChecked =
    availablePersonnel.length > 0 &&
    availablePersonnel.every((person) => pickerSelectionSet.has(person.id))

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="从人员库添加"
      description="可以先多选已有人员，也可以顺手手工新增一个基础人员。"
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.95fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">人员库</p>
              <p className="text-xs text-muted-foreground">
                已在当前工资表中的人员会显示为不可重复加入。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allAvailableChecked}
                  disabled={availablePersonnel.length === 0}
                  onChange={onToggleAllSelection}
                  className="size-4 rounded border-input"
                />
                <span>全选</span>
              </label>
              <div className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                已选 {pickerSelection.length} 人
              </div>
            </div>
          </div>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
            {personnel.length > 0 ? (
              personnel.map((person) => {
                const disabled = currentSheetPersonIds.has(person.id)
                const checked = pickerSelectionSet.has(person.id) || disabled

                return (
                  <label
                    key={person.id}
                    className={cn(
                      "grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-3 rounded-md border bg-background px-3 py-3 transition",
                      disabled
                        ? "cursor-not-allowed border-border/70 bg-muted text-muted-foreground"
                        : checked
                          ? "cursor-pointer border-primary/40 bg-accent/50 shadow-sm"
                          : "cursor-pointer border-border hover:bg-accent/60",
                    )}
                  >
                    <div className="flex h-5 items-center justify-center pt-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onToggleSelection(person.id)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-4 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground shadow-sm transition",
                          disabled
                            ? "border-border/70 bg-muted text-muted-foreground"
                            : "peer-focus-visible:border-ring peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background text-transparent",
                        )}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex min-h-5 items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {person.name}
                        </p>
                        {disabled ? (
                          <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">
                            已在当前工资表
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
                        {person.gender ? (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3.5" />
                            {person.gender}
                          </span>
                        ) : null}
                        {person.phoneNumber ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3.5" />
                            {person.phoneNumber}
                          </span>
                        ) : null}
                        {!person.gender && !person.phoneNumber ? (
                          <span>暂无补充信息</span>
                        ) : null}
                      </div>
                    </div>
                  </label>
                )
              })
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                人员库还是空的，先在右侧新增一位基础人员。
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
          className="space-y-5 rounded-xl border border-border/70 bg-card p-5"
          onSubmit={form.handleSubmit(async (values) => {
            const didCreate = await onCreatePersonnel(values)
            if (didCreate) {
              form.reset()
            }
          })}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">手工新增人员</p>
            <p className="text-xs leading-5 text-muted-foreground">
              只要求姓名必填，其余字段可以按需要补充。
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <PersonnelFormFields form={form} selectedGender={selectedGender} />
          </div>

          <Button type="submit" className="w-full" disabled={isBusy}>
            <Plus className="size-4" />
            新增到人员库
          </Button>
        </form>
      </div>
    </ModalShell>
  )
}
