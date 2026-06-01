import { Plus, WalletCards } from "lucide-react"

import type { PayrollSheetSummary } from "@/entities/payroll-sheet/api/payroll-sheet"
import { formatTimestamp } from "@/shared/lib/formatters"
import { LoadingState } from "@/shared/ui/workspace-primitives"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
    <div className="space-y-2">
      {sheets.map((sheet) => {
        const isActive = sheet.id === selectedSheetId

        return (
          <button
            key={sheet.id}
            type="button"
            className={cn(
              "w-full rounded-lg border px-4 py-3 text-left transition",
              isActive
                ? "border-primary/30 bg-accent"
                : "bg-background hover:bg-accent/60",
            )}
            onClick={() => onSelect(sheet.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{sheet.name}</p>
                <p className="text-xs text-muted-foreground">
                  最近更新 {formatTimestamp(sheet.updatedAt)}
                </p>
              </div>
              <div className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
      <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-2 pt-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sheets</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">工资表导航</h2>
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
