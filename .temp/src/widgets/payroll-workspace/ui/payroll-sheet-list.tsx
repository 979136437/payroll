import {
  ArrowRight,
  CalendarRange,
  CircleDollarSign,
  Plus,
  Trash2,
  UsersRound,
  WalletCards,
} from "lucide-react"

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
import { formatMoney, formatTimestamp } from "@/shared/lib/formatters"
import { LoadingState, SummaryTile } from "@/shared/ui/workspace-primitives"

type PayrollSheetListProps = {
  deletingSheetId?: number | null
  isDeletingSheet?: boolean
  isLoading: boolean
  overviewStats?: {
    latestSheetName: string
    personnelCount: number
    sheetCount: number
  }
  mode?: "card" | "embedded"
  onCreate: () => void
  onCreateIntent?: () => void
  onDelete?: (sheet: PayrollSheetSummary) => void
  onSelect: (sheetId: number) => void
  selectedSheetId: number | null
  sheets: PayrollSheetSummary[]
}

type SheetRowsProps = Pick<
  PayrollSheetListProps,
  "deletingSheetId" | "isDeletingSheet" | "onDelete" | "onSelect" | "selectedSheetId" | "sheets"
>

function handleCardKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  sheetId: number,
  onSelect: (sheetId: number) => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    onSelect(sheetId)
  }
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/15 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">还没有工资表</p>
      <p className="mt-1 text-xs text-muted-foreground">新建后即可按表管理人员工资记录。</p>
    </div>
  )
}

function EmbeddedSheetRows({
  deletingSheetId,
  isDeletingSheet,
  onDelete,
  onSelect,
  selectedSheetId,
  sheets,
}: SheetRowsProps) {
  if (sheets.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-2">
      {sheets.map((sheet) => {
        const isActive = sheet.id === selectedSheetId

        return (
          <div
            key={sheet.id}
            role="button"
            tabIndex={0}
            className={cn(
              "group cursor-pointer rounded-xl border px-3 py-3 transition outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              isActive
                ? "border-primary/35 bg-accent/55 shadow-sm"
                : "border-border/50 bg-background/90 hover:border-primary/35 hover:bg-accent/30",
            )}
            onClick={() => onSelect(sheet.id)}
            onKeyDown={(event) => handleCardKeyDown(event, sheet.id, onSelect)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 rounded-md text-left">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{sheet.name}</p>
                  <ArrowRight className="size-3.5 shrink-0 text-primary/70 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-1 text-xs font-medium text-primary/85">点击进入详情编辑</p>
              </div>
              {onDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isDeletingSheet}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(sheet)
                  }}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">
                    {deletingSheetId === sheet.id ? "删除中" : "删除工资表"}
                  </span>
                </Button>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-lg bg-muted/35 px-2.5 py-2">
                <p>人数</p>
                <p className="mt-1 text-sm font-medium text-foreground">{sheet.personnelCount} 人</p>
              </div>
              <div className="rounded-lg bg-muted/35 px-2.5 py-2">
                <p>总金额</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  ¥{formatMoney(sheet.totalNetPay)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-right text-xs text-muted-foreground">
              {formatTimestamp(sheet.updatedAt)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function CardSheetRows({
  deletingSheetId,
  isDeletingSheet,
  onDelete,
  onSelect,
  selectedSheetId,
  sheets,
}: SheetRowsProps) {
  if (sheets.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[minmax(0,1.6fr)_7rem_9rem_10rem_2.5rem] items-center gap-3 rounded-md border border-border/50 bg-muted/25 px-3 py-2 text-xs font-medium text-muted-foreground/80">
        <span>工资表</span>
        <span className="text-right">人数</span>
        <span className="text-right">总金额</span>
        <span className="text-right">最近更新</span>
        <span className="sr-only">操作</span>
      </div>

      {sheets.map((sheet) => {
        const isActive = sheet.id === selectedSheetId

        return (
          <div
            key={sheet.id}
            role="button"
            tabIndex={0}
            className={cn(
              "group grid cursor-pointer grid-cols-[minmax(0,1.6fr)_7rem_9rem_10rem_2.5rem] items-center gap-3 rounded-md border px-3 py-3 transition outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              isActive
                ? "border-primary/35 bg-accent/55 shadow-sm"
                : "border-border/50 bg-background/85 hover:border-primary/35 hover:bg-accent/35",
            )}
            onClick={() => onSelect(sheet.id)}
            onKeyDown={(event) => handleCardKeyDown(event, sheet.id, onSelect)}
          >
            <div className="min-w-0 rounded-md text-left">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{sheet.name}</p>
                  <ArrowRight className="size-3.5 shrink-0 text-primary/70 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="text-xs font-medium text-primary/85">点击进入详情编辑</p>
              </div>
            </div>

            <div className="text-right text-sm text-foreground">{sheet.personnelCount} 人</div>
            <div className="text-right text-sm font-medium text-foreground">
              ¥{formatMoney(sheet.totalNetPay)}
            </div>
            <div className="text-right text-xs text-muted-foreground/75">
              {formatTimestamp(sheet.updatedAt)}
            </div>

            <div className="flex justify-end">
              {onDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={isDeletingSheet}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(sheet)
                  }}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">
                    {deletingSheetId === sheet.id ? "删除中" : "删除工资表"}
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PayrollSheetList({
  deletingSheetId = null,
  isDeletingSheet = false,
  isLoading,
  overviewStats,
  mode = "embedded",
  onCreate,
  onCreateIntent,
  onDelete,
  onSelect,
  selectedSheetId,
  sheets,
}: PayrollSheetListProps) {
  const listContent = isLoading ? (
    <LoadingState label="正在读取工资表..." />
  ) : mode === "embedded" ? (
    <EmbeddedSheetRows
      deletingSheetId={deletingSheetId}
      isDeletingSheet={isDeletingSheet}
      onDelete={onDelete}
      onSelect={onSelect}
      selectedSheetId={selectedSheetId}
      sheets={sheets}
    />
  ) : (
    <CardSheetRows
      deletingSheetId={deletingSheetId}
      isDeletingSheet={isDeletingSheet}
      onDelete={onDelete}
      onSelect={onSelect}
      selectedSheetId={selectedSheetId}
      sheets={sheets}
    />
  )

  if (mode === "embedded") {
    return (
      <div className="flex h-full flex-col gap-2 rounded-3xl border border-border/55 bg-background/55 p-2 shadow-none">
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
            <CardTitle className="text-2xl font-semibold tracking-tight">工资表列表</CardTitle>
            <CardDescription>
              按期管理工资表，支持查看人数、总金额与最近更新时间。
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
        {overviewStats ? (
          <div className="flex flex-wrap gap-1.5 pt-2">
            <SummaryTile
              icon={<CalendarRange className="size-4" />}
              label="工资表数量"
              value={`${overviewStats.sheetCount}`}
            />
            <SummaryTile
              icon={<UsersRound className="size-4" />}
              label="人员数量"
              value={`${overviewStats.personnelCount}`}
            />
            <SummaryTile
              icon={<CircleDollarSign className="size-4" />}
              label="最近工资表"
              value={overviewStats.latestSheetName}
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 pb-3">{listContent}</CardContent>
    </Card>
  )
}
