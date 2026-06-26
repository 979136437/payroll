import { Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Personnel } from "@/entities/personnel/api/personnel"
import { EmptyPanel, LoadingState } from "@/shared/ui/workspace-primitives"
import { PersonnelTable } from "@/widgets/personnel-management/ui/personnel-table"

// 列表区的互斥渲染态：加载中 / 空库 / 无匹配 / 正常列表。
export type PersonnelListViewState =
  | "loading"
  | "empty-no-data"
  | "empty-no-match"
  | "list"

type PersonnelListCardProps = {
  isBatchDeleteBusy: boolean
  isRowActionBusy: boolean
  onClearSelection: () => void
  onDeleteIntent: (personnel: Personnel) => void
  onEdit: (personnel: Personnel) => void
  onOpenBatchDelete: () => void
  onOpenCreate: () => void
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  onQueryChange: (query: string) => void
  onToggleAll: (personnelIds: number[]) => void
  onToggleOne: (personnelId: number) => void
  pageIndex: number
  pageSize: number
  paginatedPersonnel: Personnel[]
  query: string
  selectedCount: number
  selectedPersonnelIdSet: Set<number>
  totalFilteredCount: number
  totalPages: number
  viewState: PersonnelListViewState
}

export function PersonnelListCard({
  isBatchDeleteBusy,
  isRowActionBusy,
  onClearSelection,
  onDeleteIntent,
  onEdit,
  onOpenBatchDelete,
  onOpenCreate,
  onPageIndexChange,
  onPageSizeChange,
  onQueryChange,
  onToggleAll,
  onToggleOne,
  pageIndex,
  pageSize,
  paginatedPersonnel,
  query,
  selectedCount,
  selectedPersonnelIdSet,
  totalFilteredCount,
  totalPages,
  viewState,
}: PersonnelListCardProps) {
  return (
    <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-muted/55 p-3 shadow-inner md:p-4">
      <Card className="border-border/80 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                人员资料列表
              </CardTitle>
              <CardDescription className="leading-6">
                可集中维护基础资料，支持搜索、编辑与批量管理。
              </CardDescription>
            </div>

            <label className="relative block w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full cursor-text rounded-md border border-input bg-background pr-3 pl-9 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="搜索姓名、联系电话、身份证号、工资卡号"
                value={query}
              />
            </label>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-4">
          {viewState === "loading" ? (
            <LoadingState label="正在读取人员列表..." />
          ) : viewState === "empty-no-match" ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              没有匹配当前搜索条件的人员。
            </div>
          ) : viewState === "empty-no-data" ? (
            <EmptyPanel
              actionLabel="新增人员"
              description="先建立人员资料，后续即可在工资工作台中直接选用。"
              onAction={onOpenCreate}
              title="还没有人员资料"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/25 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  已选择{" "}
                  <span className="font-medium text-foreground">{selectedCount}</span>{" "}
                  人
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedCount === 0}
                    onClick={onClearSelection}
                  >
                    清空选择
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={selectedCount === 0 || isBatchDeleteBusy}
                    onClick={onOpenBatchDelete}
                  >
                    <Trash2 className="size-4" />
                    批量删除
                  </Button>
                </div>
              </div>

              <PersonnelTable
                isMutating={isRowActionBusy}
                onDeleteIntent={onDeleteIntent}
                onEdit={onEdit}
                onPageIndexChange={onPageIndexChange}
                onPageSizeChange={onPageSizeChange}
                onToggleAll={onToggleAll}
                onToggleOne={onToggleOne}
                pageIndex={pageIndex}
                pageSize={pageSize}
                personnel={paginatedPersonnel}
                selectedPersonnelIdSet={selectedPersonnelIdSet}
                totalFilteredCount={totalFilteredCount}
                totalPages={totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
