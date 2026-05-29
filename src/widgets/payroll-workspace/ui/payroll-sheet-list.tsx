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
  onCreate: () => void
  onCreateIntent?: () => void
  onSelect: (sheetId: number) => void
  selectedSheetId: number | null
  sheets: PayrollSheetSummary[]
}

export function PayrollSheetList({
  isLoading,
  onCreate,
  onCreateIntent,
  onSelect,
  selectedSheetId,
  sheets,
}: PayrollSheetListProps) {
  return (
    <Card className="border-white/60 bg-white/85 shadow-xl shadow-slate-900/10 backdrop-blur">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
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
            className="rounded-full px-4"
            onClick={onCreate}
            onFocus={onCreateIntent}
            onMouseEnter={onCreateIntent}
          >
            <Plus className="size-4" />
            新建
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {isLoading ? (
          <LoadingState label="正在读取工资表..." />
        ) : (
          sheets.map((sheet) => {
            const isActive = sheet.id === selectedSheetId

            return (
              <button
                key={sheet.id}
                type="button"
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  isActive
                    ? "border-primary/60 bg-primary/8 shadow-sm"
                    : "border-border/60 bg-white/70 hover:border-primary/35 hover:bg-white",
                )}
                onClick={() => onSelect(sheet.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-medium text-slate-950">
                      {sheet.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      最近更新 {formatTimestamp(sheet.updatedAt)}
                    </p>
                  </div>
                  <div className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {sheet.personnelCount} 人
                  </div>
                </div>
              </button>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
