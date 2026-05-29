import type { ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ModalShellProps = {
  children: ReactNode
  description: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  wide?: boolean
}

export function ModalShell({
  children,
  description,
  onOpenChange,
  open,
  title,
  wide = false,
}: ModalShellProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/65 bg-white/95 p-5 shadow-2xl shadow-slate-950/20 outline-none",
            wide ? "max-w-5xl" : "max-w-xl",
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Dialog.Title className="text-xl font-semibold tracking-tight text-slate-950">
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
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
