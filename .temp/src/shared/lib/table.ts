import { cn } from "@/lib/utils"

// 列表行底色：选中态优先，否则按奇偶行交替；附带 hover 效果。
// 仅返回背景类，调用方可叠加内边距/字重等列内样式。
export function tableRowBackgroundClassName(isSelected: boolean, index: number) {
  return cn(
    "transition-colors",
    isSelected
      ? "bg-foreground/[0.04] group-hover:bg-foreground/[0.06]"
      : index % 2 === 0
        ? "bg-background group-hover:bg-foreground/[0.03]"
        : "bg-muted/[0.2] group-hover:bg-foreground/[0.03]",
  )
}
