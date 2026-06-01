import { Plus, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PayrollSheetSummary } from "@/entities/payroll-sheet/api/payroll-sheet"
import { cn } from "@/lib/utils"
import { formatTimestamp } from "@/shared/lib/formatters"
import { LoadingState } from "@/shared/ui/workspace-primitives"

type PayrollSheetListProps = {
  isLoading: boolean
  mode?: "card" | "embedded"
  onCreate: () => void
  onCreateIntent?: () => void
  onSelect: (sheetId: number) => void
  selectedSheetId: number | null
  sheets: PayrollSheetSummary[]
}

export function PayrollSheetList({
  isLoading,
  mode = "embedded",
  onCreate,
  onCreateIntent,
  onSelect,
  selectedSheetId,
  sheets,
}: PayrollSheetListProps) {
  const listContent = isLoading ? (
    <LoadingState label="正在读取工资表..." />
  ) : (
    <div className="space-y-1.5">
      {sheets.map((sheet) => {
        const isActive = sheet.id === selectedSheetId

        return (
          <button
            key={sheet.id}
            type="button"
            className={cn(
              "w-full rounded-md border px-3 py-2.5 text-left transition",
              isActive
                ? "border-border/70 bg-accent/55"
                : "border-border/50 bg-background/85 hover:bg-accent/35",
            )}
            onClick={() => onSelect(sheet.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">{sheet.name}</p>
                <p className="text-xs text-muted-foreground/75">
                  最近更新 {formatTimestamp(sheet.updatedAt)}
                </p>
              </div>
              <div className="rounded-sm bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground/80">
                {sheet.personnelCount} 人
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )

  if (mode === "embedded") {
    return (
      <div className="flex h-full flex-col gap-2 rounded-lg border border-border/55 bg-background/55 p-2 shadow-none">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">
              Sheets
            </p>
            <h2 className="text-[15px] font-medium text-foreground">工资表导航</h2>
          </div>
          <Button
            size="sm"
            className="h-7 px-2.5 text-sm"
            onClick={onCreate}
            onFocus={onCreateIntent}
            onMouseEnter={onCreateIntent}
          >
            <Plus className="size-3.5" />
            新建
          </Button>
        </div>
        {listContent}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <WalletCards className="size-4" />
              工资工作台
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              工资表列表
            </CardTitle>
            <CardDescription>
              按期管理工资表，支持从往期复制人员名单。
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="px-4"
            onClick={onCreate}
            onFocus={onCreateIntent}
            onMouseEnter={onCreateIntent}
          >
            <Plus className="size-4" />
            新建
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">{listContent}</CardContent>
    </Card>
  )
}
