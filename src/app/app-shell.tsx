import { UsersRound, WalletCards } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { PayrollWorkspacePage } from "@/pages/payroll-workspace-page/ui/payroll-workspace-page"
import { PersonnelManagementPage } from "@/widgets/personnel-management/ui/personnel-management-page"
import { cn } from "@/lib/utils"

type AppView = "payroll" | "personnel"

const viewOptions: Array<{
  description: string
  icon: typeof WalletCards
  label: string
  value: AppView
}> = [
  {
    description: "工资表总览、详情与工资录入",
    icon: WalletCards,
    label: "工资工作台",
    value: "payroll",
  },
  {
    description: "集中维护人员资料与联系方式",
    icon: UsersRound,
    label: "人员管理",
    value: "personnel",
  },
]

export function AppShell() {
  const [currentView, setCurrentView] = useState<AppView>("payroll")

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              Payroll Admin
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              工资与人员后台
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {viewOptions.map((option) => {
              const Icon = option.icon
              const isActive = currentView === option.value

              return (
                <Button
                  key={option.value}
                  className={cn(
                    "h-auto min-w-[13rem] justify-start px-4 py-3 text-left",
                    isActive ? undefined : "bg-background",
                  )}
                  onClick={() => setCurrentView(option.value)}
                  variant={isActive ? "default" : "outline"}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4" />
                    <div className="space-y-0.5">
                      <div className="font-medium">{option.label}</div>
                      <div
                        className={cn(
                          "text-xs",
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {option.description}
                      </div>
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      </header>

      {currentView === "payroll" ? (
        <PayrollWorkspacePage />
      ) : (
        <PersonnelManagementPage />
      )}
    </div>
  )
}
