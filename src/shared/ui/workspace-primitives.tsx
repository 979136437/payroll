import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FieldProps = {
  children: ReactNode
  error?: string
  label: string
}

export function Field({ children, error, label }: FieldProps) {
  return (
    <label className="block space-y-3">
      <span className="text-sm font-medium leading-none text-foreground">
        {label}
      </span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  )
}

type MessageBarProps = {
  children: ReactNode
  variant: "error" | "notice"
}

export function MessageBar({ children, variant }: MessageBarProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "error"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-border bg-muted/60 text-foreground",
      )}
    >
      {children}
    </div>
  )
}

type EmptyPanelProps = {
  actionLabel: string
  description: string
  onAction: () => void
  onActionIntent?: () => void
  title: string
}

export function EmptyPanel({
  actionLabel,
  description,
  onAction,
  onActionIntent,
  title,
}: EmptyPanelProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border bg-card px-6 py-14 text-center shadow-sm">
      <div className="max-w-md space-y-3">
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      <Button
        className="mt-6 px-5"
        onClick={onAction}
        onFocus={onActionIntent}
        onMouseEnter={onActionIntent}
      >
        {actionLabel}
      </Button>
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 px-6 py-12 text-sm text-muted-foreground">
      <div className="size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      {label}
    </div>
  )
}

type SummaryTileProps = {
  icon: ReactNode
  label: string
  value: string
}

export function SummaryTile({ icon, label, value }: SummaryTileProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border/35 bg-background/35 px-2.5 py-1.5 shadow-none">
      <span className="text-muted-foreground/75">{icon}</span>
      <span className="text-[11px] font-medium text-muted-foreground/85">
        {label}
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        {value}
      </span>
    </div>
  )
}
