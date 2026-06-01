import { Check, ChevronDown } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SelectFieldOption = {
  description?: string
  label: string
  value: string
}

type SelectFieldProps = {
  className?: string
  emptyText?: string
  onChange: (value: string) => void
  options: SelectFieldOption[]
  placeholder: string
  value: string
}

export function SelectField({
  className,
  emptyText,
  onChange,
  options,
  placeholder,
  value,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<{
    maxHeight: number
    placement: "bottom" | "top"
  } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return
    }

    function updatePanelStyle() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const viewportPadding = 12
      const panelGap = 8
      const preferredHeight = 280
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const shouldOpenUpward =
        spaceBelow < preferredHeight && spaceAbove > spaceBelow
      const maxHeight = Math.max(
        120,
        shouldOpenUpward ? spaceAbove - panelGap : spaceBelow - panelGap,
      )

      setPanelStyle({
        maxHeight,
        placement: shouldOpenUpward ? "top" : "bottom",
      })
    }

    updatePanelStyle()

    window.addEventListener("resize", updatePanelStyle)
    window.addEventListener("scroll", updatePanelStyle, true)

    return () => {
      window.removeEventListener("resize", updatePanelStyle)
      window.removeEventListener("scroll", updatePanelStyle, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node

      if (
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const selectedOption = options.find((option) => option.value === value) ?? null

  return (
    <div className={cn("relative", className)}>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        className={cn(
          "h-10 w-full justify-between rounded-md border-input bg-background px-3 font-normal text-foreground shadow-none hover:bg-accent hover:text-accent-foreground",
          open && "border-ring ring-2 ring-ring/20",
          !selectedOption && "text-muted-foreground",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>

      {open && panelStyle ? (
        <div
          ref={panelRef}
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute left-0 z-[60] w-full overflow-y-auto rounded-md border bg-background p-1 text-foreground shadow-md",
            panelStyle.placement === "top"
              ? "bottom-[calc(100%+0.5rem)]"
              : "top-[calc(100%+0.5rem)]",
          )}
          style={{
            maxHeight: panelStyle.maxHeight,
          }}
        >
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm transition hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="min-w-0 space-y-0.5">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span
                        className={cn(
                          "block text-xs text-muted-foreground",
                          isSelected && "text-accent-foreground/80",
                        )}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <Check
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      isSelected ? "opacity-100 text-current" : "opacity-0",
                    )}
                  />
                </button>
              )
            })
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {emptyText ?? "暂无可选项"}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
