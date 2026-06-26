import { AlertCircle, CheckCircle2, X } from "lucide-react"
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"

import { cn } from "@/lib/utils"

type ToastVariant = "error" | "notice"

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastSnapshot = {
  items: ToastItem[]
}

type ToastStore = {
  dismiss: (id: number) => void
  getSnapshot: () => ToastSnapshot
  push: (message: string, variant: ToastVariant) => void
  subscribe: (listener: () => void) => () => void
}

const TOAST_DURATION_MS = 2800

let nextToastId = 1
let snapshot: ToastSnapshot = { items: [] }
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

function dismissToast(id: number) {
  snapshot = {
    items: snapshot.items.filter((item) => item.id !== id),
  }
  emitChange()
}

function pushToast(message: string, variant: ToastVariant) {
  const id = nextToastId++
  snapshot = {
    items: [...snapshot.items, { id, message, variant }],
  }
  emitChange()
  window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
}

const toastStore: ToastStore = {
  dismiss: dismissToast,
  getSnapshot: () => snapshot,
  push: pushToast,
  subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

const ToastContext = createContext<ToastStore>(toastStore)

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => toastStore, [])
  return <ToastContext value={value}>{children}</ToastContext>
}

export function useToast() {
  return use(ToastContext)
}

export function toast(message: string, variant: ToastVariant = "notice") {
  toastStore.push(message, variant)
}

export function useToastFeedback(options: {
  clearFeedback: () => void
  errorMessage: string | null
  notice: string | null
}) {
  const { clearFeedback, errorMessage, notice } = options
  const lastHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!errorMessage && !notice) {
      lastHandledRef.current = null
      return
    }

    const signature = `${errorMessage ?? ""}::${notice ?? ""}`
    if (lastHandledRef.current === signature) {
      return
    }

    lastHandledRef.current = signature

    if (errorMessage) {
      toast(errorMessage, "error")
    }

    if (notice) {
      toast(notice, "notice")
    }

    clearFeedback()
  }, [clearFeedback, errorMessage, notice])
}

export function ToastViewport() {
  const store = useToast()
  const { items } = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2 px-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            item.variant === "error"
              ? "border-destructive/20 bg-destructive text-destructive-foreground"
              : "border-border/70 bg-background/95 text-foreground",
          )}
        >
          <span className="mt-0.5 shrink-0">
            {item.variant === "error" ? (
              <AlertCircle className="size-4 text-white" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
          </span>

          <p
            className={cn(
              "min-w-0 flex-1 text-sm leading-6",
              item.variant === "error" && "text-white",
            )}
          >
            {item.message}
          </p>

          <button
            type="button"
            className={cn(
              "shrink-0 rounded-sm p-0.5 transition",
              item.variant === "error"
                ? "text-white hover:bg-white/10"
                : "hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={() => store.dismiss(item.id)}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
