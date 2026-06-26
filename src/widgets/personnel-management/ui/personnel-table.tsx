import { SquarePen, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import type { Personnel } from "@/entities/personnel/api/personnel"
import { cn } from "@/lib/utils"
import { maskSensitiveValue } from "@/shared/lib/formatters"
import { SelectField } from "@/shared/ui/select-field"

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

// 行底色：选中态优先，否则按奇偶行交替，并统一附加 hover 效果。
function rowCellClassName(isSelected: boolean, index: number) {
  return cn(
    "px-4 py-3 transition-colors",
    isSelected
      ? "bg-foreground/[0.04] group-hover:bg-foreground/[0.06]"
      : index % 2 === 0
        ? "bg-background group-hover:bg-foreground/[0.03]"
        : "bg-muted/[0.2] group-hover:bg-foreground/[0.03]",
  )
}

export function PersonnelTable({
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
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const personnelIds = personnel.map((item) => item.id)
  const allVisibleSelected =
    personnelIds.length > 0 &&
    personnelIds.every((personnelId) => selectedPersonnelIdSet.has(personnelId))
  const someVisibleSelected =
    personnelIds.some((personnelId) => selectedPersonnelIdSet.has(personnelId)) &&
    !allVisibleSelected

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-background">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">
              <label className="flex items-center justify-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="全选当前页人员"
                  checked={allVisibleSelected}
                  disabled={personnelIds.length === 0}
                  onChange={() => onToggleAll(personnelIds)}
                  className="size-4 cursor-pointer rounded border-input accent-primary shadow-none outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                />
              </label>
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

            return (
              <tr key={item.id} className="group border-t transition">
                <td className={rowCellClassName(isSelected, index)}>
                  <label className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${item.name}`}
                      checked={isSelected}
                      onChange={() => onToggleOne(item.id)}
                      className="size-4 cursor-pointer rounded border-input accent-primary shadow-none outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                    />
                  </label>
                </td>
                <td
                  className={cn(
                    rowCellClassName(isSelected, index),
                    "font-medium text-foreground",
                  )}
                >
                  {item.name}
                </td>
                <td className={rowCellClassName(isSelected, index)}>
                  {item.gender || "-"}
                </td>
                <td className={rowCellClassName(isSelected, index)}>
                  {item.ethnicity || "-"}
                </td>
                <td className={rowCellClassName(isSelected, index)}>
                  {item.phoneNumber || "-"}
                </td>
                <td className={rowCellClassName(isSelected, index)}>
                  {maskSensitiveValue(item.idCardNumber)}
                </td>
                <td className={rowCellClassName(isSelected, index)}>
                  {maskSensitiveValue(item.payrollCardNumber)}
                </td>
                <td className={rowCellClassName(isSelected, index)}>
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
      <div className="flex flex-col gap-3 border-t border-border/80 bg-background px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="text-muted-foreground">
          第 {pageIndex + 1} / {totalPages} 页，共 {totalFilteredCount} 条
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>每页</span>
            <SelectField
              className="w-[5.25rem]"
              placeholder="10"
              triggerClassName="h-8 min-h-8 px-2.5 text-[0.8rem]"
              value={`${pageSize}`}
              onChange={(value) => {
                onPageSizeChange(Number(value))
              }}
              options={[10, 20, 50].map((size) => ({
                label: `${size}`,
                value: `${size}`,
              }))}
            />
            <span>条</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pageIndex === 0}
              onClick={() => onPageIndexChange(pageIndex - 1)}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => onPageIndexChange(pageIndex + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
