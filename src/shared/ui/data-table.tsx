import { Button } from "@/components/ui/button"
import { SelectField } from "@/shared/ui/select-field"

const PAGE_SIZE_OPTIONS = [10, 20, 50]

type TablePaginationFooterProps = {
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageIndex: number
  pageSize: number
  totalCount: number
  totalPages: number
}

// 表格底部分页条：每页条数选择 + 上/下一页 + 计数文案，供各列表表格复用。
export function TablePaginationFooter({
  onPageIndexChange,
  onPageSizeChange,
  pageIndex,
  pageSize,
  totalCount,
  totalPages,
}: TablePaginationFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/80 bg-background px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <div className="text-muted-foreground">
        第 {pageIndex + 1} / {totalPages} 页，共 {totalCount} 条
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>每页</span>
          <SelectField
            className="w-21"
            placeholder="10"
            triggerClassName="h-8 min-h-8 px-2.5 text-[0.8rem]"
            value={`${pageSize}`}
            onChange={(value) => {
              onPageSizeChange(Number(value))
            }}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
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
  )
}
