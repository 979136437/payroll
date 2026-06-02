import { CalendarRange, CircleDollarSign, UsersRound } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { SummaryTile } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollSheetBrowser } from "@/widgets/payroll-workspace/ui/payroll-sheet-browser"

export function PayrollOverviewPanel() {
  const { personnelCount, selectedSheetName, sheetCount, setCreateSheetOpen } =
    usePayrollWorkspaceStore(
      useShallow((state) => ({
        personnelCount: state.personnel.length,
        selectedSheetName:
          state.sheets.find((sheet) => sheet.id === state.selectedSheetId)?.name ??
          "尚未进入工资表",
        setCreateSheetOpen: state.setCreateSheetOpen,
        sheetCount: state.sheets.length,
      })),
    )

  return (
    <section className="flex min-h-full flex-col gap-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-muted-foreground">工资工作台</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              工资工作台
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              先从总览主页进入，再按工资表切换到详情编辑工作台，让概览、导航和录入各归其位。
            </p>
          </div>

          <Button className="px-6" onClick={() => setCreateSheetOpen(true)}>
            新建工资表
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile
          icon={<CalendarRange className="size-4" />}
          label="工资表数量"
          value={`${sheetCount}`}
        />
        <SummaryTile
          icon={<UsersRound className="size-4" />}
          label="人员数量"
          value={`${personnelCount}`}
        />
        <SummaryTile
          icon={<CircleDollarSign className="size-4" />}
          label="最近上下文"
          value={selectedSheetName}
        />
      </div>

      <PayrollSheetBrowser />
    </section>
  )
}
