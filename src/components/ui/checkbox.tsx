import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type CheckboxProps = {
  "aria-label"?: string
  checked: boolean
  className?: string
  disabled?: boolean
  indeterminate?: boolean
  onCheckedChange: () => void
}

// 列表多选用的原生风格复选框，统一选中态配色与去焦点描边，供各表格复用。
// 内部用 ref 维护 indeterminate（HTML 复选框该状态只能通过 DOM 属性设置）。
export function Checkbox({
  "aria-label": ariaLabel,
  checked,
  className,
  disabled = false,
  indeterminate = false,
  onCheckedChange,
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <label className="flex items-center justify-center">
      <input
        ref={inputRef}
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={onCheckedChange}
        className={cn(
          "size-4 cursor-pointer rounded border-input accent-primary shadow-none outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none",
          className,
        )}
      />
    </label>
  )
}
