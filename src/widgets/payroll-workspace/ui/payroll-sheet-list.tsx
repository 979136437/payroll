import { Plus, WalletCards } from "lucide-react"

import type { PayrollSheetSummary } from "@/entities/payroll-sheet/api/payroll-sheet"
import { formatTimestamp } from "@/shared/lib/formatters"
import { EmptyPanel, LoadingState } from "@/shared/ui/workspace-primitives"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const COPY = {
  create: "\u65b0\u5efa",
  createSheet: "\u521b\u5efa\u5de5\u8d44\u8868",
  description:
    "\u6309\u671f\u7ba1\u7406\u5de5\u8d44\u8868\uff0c\u652f\u6301\u4ece\u5f80\u671f\u590d\u5236\u4eba\u5458\u540d\u5355\u3002",
  emptyDescription:
    "\u5148\u521b\u5efa\u7b2c\u4e00\u5f20\u5de5\u8d44\u8868\uff0c\u518d\u5f00\u59cb\u5bfc\u5165\u4eba\u5458\u548c\u5f55\u5165\u5b9e\u53d1\u5de5\u8d44\u3002",
  emptyTitle: "\u8fd8\u6ca1\u6709\u5de5\u8d44\u8868",
  loading: "\u6b63\u5728\u8bfb\u53d6\u5de5\u8d44\u8868...",
  recentUpdate: "\u6700\u8fd1\u66f4\u65b0",
  title: "\u5de5\u8d44\u8868\u5217\u8868",
  workspace: "\u5de5\u8d44\u5de5\u4f5c\u53f0",
}

type PayrollSheetListProps = {
  isLoading: boolean
  onCreate: () => void
  onSelect: (sheetId: number) => void
  selectedSheetId: number | null
  sheets: PayrollSheetSummary[]
}

export function PayrollSheetList({
  isLoading,
  onCreate,
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
              {COPY.workspace}
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {COPY.title}
            </CardTitle>
            <CardDescription>{COPY.description}</CardDescription>
          </div>
          <Button size="sm" className="rounded-full px-4" onClick={onCreate}>
            <Plus className="size-4" />
            {COPY.create}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {isLoading ? (
          <LoadingState label={COPY.loading} />
        ) : sheets.length > 0 ? (
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
                      {COPY.recentUpdate} {formatTimestamp(sheet.updatedAt)}
                    </p>
                  </div>
                  <div className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {sheet.personnelCount} \u4eba
                  </div>
                </div>
              </button>
            )
          })
        ) : (
          <EmptyPanel
            title={COPY.emptyTitle}
            description={COPY.emptyDescription}
            actionLabel={COPY.createSheet}
            onAction={onCreate}
          />
        )}
      </CardContent>
    </Card>
  )
}
