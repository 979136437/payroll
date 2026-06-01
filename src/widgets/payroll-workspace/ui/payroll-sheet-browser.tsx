import { FolderOpen, Plus } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimestamp } from "@/shared/lib/formatters"
import {
  EmptyPanel,
  MessageBar,
} from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

export function PayrollSheetBrowser() {
  const { errorMessage, notice, openSheetDetail, setCreateSheetOpen, sheets } =
    usePayrollWorkspaceStore(
      useShallow((state) => ({
        errorMessage: state.errorMessage,
        notice: state.notice,
        openSheetDetail: state.openSheetDetail,
        setCreateSheetOpen: state.setCreateSheetOpen,
        sheets: state.sheets,
      })),
    )

  if (sheets.length === 0) {
    return (
      <EmptyPanel
        actionLabel="新建工资表"
        description="先创建一张工资表，再进入工资记录编辑工作台。"
        onAction={() => setCreateSheetOpen(true)}
        title="还没有工资表"
      />
    )
  }

  return (
    <div className="space-y-4">
      {errorMessage ? <MessageBar variant="error">{errorMessage}</MessageBar> : null}
      {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sheets.map((sheet) => (
          <Card key={sheet.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <FolderOpen className="size-4" />
                  工资资源
                </div>
                <CardTitle className="text-xl font-semibold text-foreground">{sheet.name}</CardTitle>
              </div>

              <div className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {sheet.personnelCount} 人
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">最近更新 {formatTimestamp(sheet.updatedAt)}</p>

              <Button
                className="px-5"
                onClick={() =>
                  startTransition(() => {
                    void openSheetDetail(sheet.id)
                  })
                }
              >
                <Plus className="size-4" />
                打开工资表
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
