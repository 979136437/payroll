import type { ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ModalShellProps = {
  children: ReactNode
  description: string
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  wide?: boolean
}

export function ModalShell({
  children,
  description,
  footer,
  onOpenChange,
  open,
  title,
  wide = false,
}: ModalShellProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-background p-6 shadow-lg outline-none",
            wide ? "max-w-5xl" : "max-w-xl",
          )}
        >
          <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
            <div className="space-y-1">
              <Dialog.Title className="text-xl font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <div className="pr-5">{children}</div>
          </div>
          {footer ? (
            <div className="shrink-0 pt-4">{footer}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
