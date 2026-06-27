import { Search, UsersRound } from "lucide-react"

import { SummaryTile } from "@/shared/ui/workspace-primitives"

type PersonnelSummaryTilesProps = {
  filteredCount: number
  totalCount: number
}

export function PersonnelSummaryTiles({
  filteredCount,
  totalCount,
}: PersonnelSummaryTilesProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <SummaryTile
        icon={<UsersRound className="size-3.5" />}
        label="人员总数"
        value={`${totalCount}`}
      />
      <SummaryTile
        icon={<Search className="size-3.5" />}
        label="当前筛选"
        value={`${filteredCount}`}
      />
      {totalCount > 0 ? (
        <div className="inline-flex items-center rounded-md px-1 text-sm text-muted-foreground/65">
          集中维护人员资料
        </div>
      ) : null}
    </div>
  )
}
