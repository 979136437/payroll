import { Button } from "@/components/ui/button"
import { ModalShell } from "@/shared/ui/modal-shell"

type ConfirmDialogProps = {
  confirmLabel?: string
  description: string
  isBusy?: boolean
  onConfirm: () => Promise<void> | void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function ConfirmDialog({
  confirmLabel = "确认删除",
  description,
  isBusy = false,
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
          删除后将立即生效，当前人员及其关联工资记录不会保留。
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isBusy}
            onClick={async () => {
              await onConfirm()
            }}
          >
            {isBusy ? "删除中..." : confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
