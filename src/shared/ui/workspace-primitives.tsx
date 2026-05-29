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
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
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
        "rounded-2xl px-4 py-3 text-sm",
        variant === "error"
          ? "border border-destructive/25 bg-destructive/8 text-destructive"
          : "border border-primary/20 bg-primary/8 text-slate-700",
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
    <div className="flex flex-1 flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-secondary/20 px-6 py-12 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-xl font-semibold tracking-tight text-slate-950">{title}</p>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      <Button
        className="mt-6 rounded-full px-5"
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
    <div className="flex flex-1 items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border/70 bg-secondary/20 px-6 py-12 text-sm text-muted-foreground">
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
    <div className="rounded-3xl border border-border/70 bg-secondary/25 p-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-slate-700">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  )
}
