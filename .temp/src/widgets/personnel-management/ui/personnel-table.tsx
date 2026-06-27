import { AlertTriangle, SquarePen, Trash2 } from "lucide-react"
import { memo, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Personnel } from "@/entities/personnel/api/personnel"
import { cn } from "@/lib/utils"
import { maskSensitiveValue } from "@/shared/lib/formatters"
import { tableRowBackgroundClassName } from "@/shared/lib/table"
import { TablePaginationFooter } from "@/shared/ui/data-table"

type PersonnelTableProps = {
  isMutating: boolean
  onEdit: (personnel: Personnel) => void
  onDeleteIntent: (personnel: Personnel) => void
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  onToggleAll: (personnelIds: number[]) => void
  onToggleOne: (personnelId: number) => void
  pageIndex: number
  pageSize: number
  personnel: Personnel[]
  selectedPersonnelIdSet: Set<number>
  totalFilteredCount: number
  totalPages: number
}

const cellClassName = (isSelected: boolean, index: number) =>
  cn("px-4 py-3", tableRowBackgroundClassName(isSelected, index))

const stickyCellClassName = () =>
  cn("bg-background px-4 py-3")

export const PersonnelTable = memo(function PersonnelTable({
  isMutating,
  onEdit,
  onDeleteIntent,
  onPageIndexChange,
  onPageSizeChange,
  onToggleAll,
  onToggleOne,
  pageIndex,
  pageSize,
  personnel,
  selectedPersonnelIdSet,
  totalFilteredCount,
  totalPages,
}: PersonnelTableProps) {
  const personnelIds = useMemo(
    () => personnel.map((item) => item.id),
    [personnel],
  )
  const { allVisibleSelected, someVisibleSelected } = useMemo(() => {
    const selectedCount = personnelIds.reduce(
      (count, personnelId) =>
        selectedPersonnelIdSet.has(personnelId) ? count + 1 : count,
      0,
    )
    const all = personnelIds.length > 0 && selectedCount === personnelIds.length
    return {
      allVisibleSelected: all,
      someVisibleSelected: selectedCount > 0 && !all,
    }
  }, [personnelIds, selectedPersonnelIdSet])

  return (
    <div className="rounded-xl border border-border/80 bg-background">
      <Table className="min-w-full border-collapse">
        <TableHeader className="bg-muted/70 text-muted-foreground">
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableHead className="px-4 py-3 text-muted-foreground">
              <Checkbox
                aria-label="全选当前页人员"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                disabled={personnelIds.length === 0}
                onCheckedChange={() => onToggleAll(personnelIds)}
              />
            </TableHead>
            <TableHead className="px-4 py-3 text-muted-foreground">姓名</TableHead>
            <TableHead className="px-4 py-3 text-muted-foreground">性别</TableHead>
            <TableHead className="px-4 py-3 text-muted-foreground">民族</TableHead>
            <TableHead className="px-4 py-3 text-muted-foreground">联系电话</TableHead>
            <TableHead className="px-4 py-3 text-muted-foreground">身份证号</TableHead>
            <TableHead className="px-4 py-3 text-muted-foreground">工资卡号</TableHead>
            <TableHead className="sticky right-0 z-10 border-l border-border bg-background px-4 py-3 text-right text-muted-foreground">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personnel.map((item, index) => {
            const isSelected = selectedPersonnelIdSet.has(item.id)
            const cellClass = cellClassName(isSelected, index)

            return (
              <TableRow key={item.id} className="border-t">
                <TableCell className={cellClass}>
                  <Checkbox
                    aria-label={`选择 ${item.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleOne(item.id)}
                  />
                </TableCell>
                <TableCell className={cn(cellClass, "font-medium text-foreground")}>
                  <span className="inline-flex items-center gap-1.5">
                    {item.name}
                    {!item.idCardNumber ||
                    !item.payrollCardNumber ||
                    !item.phoneNumber ? (
                      <AlertTriangle
                        className="size-3 shrink-0 text-foreground"
                        aria-label="人员信息不完整"
                      />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className={cellClass}>{item.gender || "-"}</TableCell>
                <TableCell className={cellClass}>{item.ethnicity || "-"}</TableCell>
                <TableCell className={cellClass}>{item.phoneNumber || "-"}</TableCell>
                <TableCell className={cellClass}>{maskSensitiveValue(item.idCardNumber)}</TableCell>
                <TableCell className={cellClass}>
                  {maskSensitiveValue(item.payrollCardNumber)}
                </TableCell>
                <TableCell className={cn(stickyCellClassName(), "sticky right-0 z-10 border-l border-border")}>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                      <SquarePen className="size-4" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isMutating}
                      onClick={() => onDeleteIntent(item)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <TablePaginationFooter
        onPageIndexChange={onPageIndexChange}
        onPageSizeChange={onPageSizeChange}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={totalFilteredCount}
        totalPages={totalPages}
      />
    </div>
  )
})
