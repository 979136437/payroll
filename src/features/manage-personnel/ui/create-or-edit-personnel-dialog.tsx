import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Save, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import type { Personnel } from "@/entities/personnel/api/personnel"
import {
  createPersonnelSchema,
  type CreatePersonnelValues,
} from "@/features/manage-personnel/model/schema"
import { PersonnelFormFields } from "@/features/manage-personnel/ui/personnel-form-fields"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ModalShell } from "@/shared/ui/modal-shell"

type CreateOrEditPersonnelDialogProps = {
  initialPersonnel?: Personnel | null
  isBusy: boolean
  isDeleting?: boolean
  mode: "create" | "edit"
  onDelete?: () => Promise<void> | void
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreatePersonnelValues) => Promise<boolean>
  open: boolean
  showDeleteAction?: boolean
}

function toFormValues(personnel?: Personnel | null): CreatePersonnelValues {
  return {
    bankName: personnel?.bankName ?? "",
    ethnicity: personnel?.ethnicity ?? "",
    gender: personnel?.gender === "男" || personnel?.gender === "女" ? personnel.gender : "",
    idCardNumber: personnel?.idCardNumber ?? "",
    name: personnel?.name ?? "",
    nativePlace: personnel?.nativePlace ?? "",
    payrollCardNumber: personnel?.payrollCardNumber ?? "",
    phoneNumber: personnel?.phoneNumber ?? "",
  }
}

export function CreateOrEditPersonnelDialog({
  initialPersonnel,
  isBusy,
  isDeleting = false,
  mode,
  onDelete,
  onOpenChange,
  onSubmit,
  open,
  showDeleteAction = false,
}: CreateOrEditPersonnelDialogProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const form = useForm<CreatePersonnelValues>({
    resolver: zodResolver(createPersonnelSchema),
    defaultValues: toFormValues(initialPersonnel),
  })

  useEffect(() => {
    form.reset(toFormValues(initialPersonnel))
    if (!open) {
      setIsConfirmOpen(false)
    }
  }, [form, initialPersonnel, open])

  const selectedGender =
    useWatch({
      control: form.control,
      name: "gender",
    }) ?? ""

  const isEdit = mode === "edit"
  const isMutating = isBusy || isDeleting

  return (
    <>
      <ModalShell
        open={open}
        onOpenChange={onOpenChange}
        title={isEdit ? "编辑人员" : "新增人员"}
        description={
          isEdit
            ? "更新人员基础资料后，工资工作台和人员管理页都会同步显示最新信息。"
            : "新增一位人员到人员库，后续可以在工资工作台中直接选用。"
        }
      >
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(async (values) => {
            const didSubmit = await onSubmit(values)
            if (didSubmit && !isEdit) {
              form.reset(toFormValues(null))
            }
          })}
        >
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5">
            <PersonnelFormFields form={form} selectedGender={selectedGender} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              {isEdit && showDeleteAction && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isMutating}
                  onClick={() => setIsConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />
                  删除人员
                </Button>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isMutating}
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isEdit ? <Save className="size-4" /> : <Plus className="size-4" />}
                {isEdit ? "保存人员信息" : "新增人员"}
              </Button>
            </div>
          </div>
        </form>
      </ModalShell>

      {isEdit && showDeleteAction && onDelete ? (
        <ConfirmDialog
          confirmLabel="确认删除人员"
          description="删除该人员后，会同时移除其在全部工资表中的记录。"
          isBusy={isDeleting}
          onConfirm={async () => {
            await onDelete()
          }}
          onOpenChange={setIsConfirmOpen}
          open={isConfirmOpen}
          title="确认删除人员"
        />
      ) : null}
    </>
  )
}
