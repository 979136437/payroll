import { SquarePen, Trash2 } from "lucide-react"
import { memo, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-background">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">
              <Checkbox
                aria-label="全选当前页人员"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                disabled={personnelIds.length === 0}
                onCheckedChange={() => onToggleAll(personnelIds)}
              />
            </th>
            <th className="px-4 py-3 font-medium">姓名</th>
            <th className="px-4 py-3 font-medium">性别</th>
            <th className="px-4 py-3 font-medium">民族</th>
            <th className="px-4 py-3 font-medium">联系电话</th>
            <th className="px-4 py-3 font-medium">身份证号</th>
            <th className="px-4 py-3 font-medium">工资卡号</th>
            <th className="px-4 py-3 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {personnel.map((item, index) => {
            const isSelected = selectedPersonnelIdSet.has(item.id)
            const cellClass = cellClassName(isSelected, index)

            return (
              <tr key={item.id} className="group border-t transition">
                <td className={cellClass}>
                  <Checkbox
                    aria-label={`选择 ${item.name}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleOne(item.id)}
                  />
                </td>
                <td className={cn(cellClass, "font-medium text-foreground")}>
                  {item.name}
                </td>
                <td className={cellClass}>{item.gender || "-"}</td>
                <td className={cellClass}>{item.ethnicity || "-"}</td>
                <td className={cellClass}>{item.phoneNumber || "-"}</td>
                <td className={cellClass}>{maskSensitiveValue(item.idCardNumber)}</td>
                <td className={cellClass}>
                  {maskSensitiveValue(item.payrollCardNumber)}
                </td>
                <td className={cellClass}>
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
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
