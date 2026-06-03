import type { ReactNode } from "react"
import { Check, Search, Trash2, UserPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Personnel } from "@/entities/personnel/api/personnel"
import { cn } from "@/lib/utils"
import { ModalShell } from "@/shared/ui/modal-shell"

type PersonnelPickerDialogProps = {
  availablePersonnel: Personnel[]
  isBusy: boolean
  onAddPendingPersonnel: (personnelId: number) => void
  onOpenChange: (open: boolean) => void
  onOpenCreatePersonnel: () => void
  onRemovePendingPersonnel: (personnelId: number) => void
  onRemoveSelectedPendingPersonnel: () => void
  onSetNetPayDraft: (value: string) => void
  onSetQuery: (value: string) => void
  onSubmit: () => Promise<void>
  onTogglePendingSelection: (personnelId: number) => void
  open: boolean
  pendingAddNetPayDraft: string
  pendingPersonnel: Personnel[]
  pendingSelectionIds: number[]
  query: string
}

function PersonnelCard({
  action,
  person,
}: {
  action: ReactNode
  person: Personnel
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 transition hover:border-primary/30 hover:bg-accent/20 hover:shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export function PersonnelPickerDialog({
  availablePersonnel,
  isBusy,
  onAddPendingPersonnel,
  onOpenChange,
  onOpenCreatePersonnel,
  onRemovePendingPersonnel,
  onRemoveSelectedPendingPersonnel,
  onSetNetPayDraft,
  onSetQuery,
  onSubmit,
  onTogglePendingSelection,
  open,
  pendingAddNetPayDraft,
  pendingPersonnel,
  pendingSelectionIds,
  query,
}: PersonnelPickerDialogProps) {
  const pendingSelectionSet = new Set(pendingSelectionIds)

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="从人员库添加"
      description="先从右侧挑人加入本次添加清单，再统一加入当前工资表。"
      wide
    >
      <div className="grid gap-6 lg:h-[min(40rem,calc(100vh-14rem))] lg:grid-cols-[0.98fr_1.02fr]">
        <section className="flex min-h-0 flex-col gap-4 rounded-xl border border-border/70 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">本次添加的人员</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                已选 {pendingPersonnel.length} 人，可统一设置同一实发工资。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingSelectionIds.length === 0 || isBusy}
              onClick={onRemoveSelectedPendingPersonnel}
            >
              <Trash2 className="size-4" />
              批量移除
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <label className="grid gap-2 text-sm md:grid-cols-[5.75rem_minmax(0,1fr)] md:items-center">
              <span className="font-medium text-foreground">统一实发工资</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                value={pendingAddNetPayDraft}
                onChange={(event) => onSetNetPayDraft(event.target.value)}
                placeholder="可留空"
                disabled={isBusy}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </label>
            <p className="text-xs leading-5 text-muted-foreground">
              留空时只加入人员；填写后会为本次加入的人员统一写入该工资。
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30 p-3">
            <div className="flex h-full flex-col gap-2 overflow-y-auto pr-2">
              {pendingPersonnel.length > 0 ? (
                pendingPersonnel.map((person) => {
                  const selected = pendingSelectionSet.has(person.id)

                  return (
                    <label
                      key={person.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 transition hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm",
                        isBusy && "cursor-not-allowed",
                      )}
                    >
                      <span className="flex shrink-0 items-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={isBusy}
                          onChange={() => onTogglePendingSelection(person.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-4 items-center justify-center rounded-[4px] border bg-background text-transparent shadow-sm transition",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-input",
                            isBusy
                              ? "opacity-60"
                              : "peer-focus-visible:border-ring peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30",
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {person.name}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onRemovePendingPersonnel(person.id)
                        }}
                        aria-label={`移除 ${person.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </label>
                  )
                })
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  右侧选择人员后，会先进入这里等待统一提交。
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
            <Button
              type="button"
              disabled={pendingPersonnel.length === 0 || isBusy}
              onClick={() => void onSubmit()}
            >
              加入当前工资表
            </Button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-4 rounded-xl border border-border/70 bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">待添加的人员</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                自动排除已在当前工资表和已加入左侧清单的人员。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={onOpenCreatePersonnel}
            >
              <UserPlus className="size-4" />
              新增人员
            </Button>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => onSetQuery(event.target.value)}
              placeholder="搜索姓名、手机号、身份证号、工资卡号"
              disabled={isBusy}
              className="h-10 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30 p-3">
            <div className="flex h-full flex-col gap-2 overflow-y-auto pr-2">
              {availablePersonnel.length > 0 ? (
                availablePersonnel.map((person) => (
                  <PersonnelCard
                    key={person.id}
                    person={person}
                    action={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => onAddPendingPersonnel(person.id)}
                      >
                        添加
                      </Button>
                    }
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  没有可添加的人员了，可以调整搜索条件或先新增人员。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ModalShell>
  )
}
