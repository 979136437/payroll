import { Download, Upload, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"

type PersonnelPageHeaderProps = {
  isExporting: boolean
  isImporting: boolean
  onExport: () => void
  onImport: () => void
  onOpenCreate: () => void
}

export function PersonnelPageHeader({
  isExporting,
  isImporting,
  onExport,
  onImport,
  onOpenCreate,
}: PersonnelPageHeaderProps) {
  const isTransferring = isImporting || isExporting

  return (
    <div className="rounded-md border border-border/35 bg-background/45 px-3 py-2.5 shadow-none">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/75">
            Personnel Management
          </p>
          <div className="flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-3">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
              人员管理
            </h1>
            <p className="truncate text-sm text-muted-foreground/65">
              统一维护姓名、证件、银行卡与联系方式，新增后可直接在工资工作台复用。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="h-8 px-4 text-sm" size="sm" onClick={onOpenCreate}>
            <UserPlus className="size-3.5" />
            新增人员
          </Button>
          <Button
            className="h-8 px-4 text-sm"
            size="sm"
            variant="outline"
            disabled={isTransferring}
            onClick={onImport}
          >
            <Upload className="size-3.5" />
            导入人员
          </Button>
          <Button
            className="h-8 px-4 text-sm"
            size="sm"
            variant="outline"
            disabled={isTransferring}
            onClick={onExport}
          >
            <Download className="size-3.5" />
            导出人员
          </Button>
        </div>
      </div>
    </div>
  )
}
