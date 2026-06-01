import { UsersRound, WalletCards } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PayrollWorkspacePage } from "@/pages/payroll-workspace-page/ui/payroll-workspace-page"
import { ToastProvider, ToastViewport } from "@/shared/ui/toast"
import { PersonnelManagementPage } from "@/widgets/personnel-management/ui/personnel-management-page"

type AppView = "payroll" | "personnel"

const viewOptions: Array<{
  icon: typeof WalletCards
  label: string
  value: AppView
}> = [
  {
    icon: WalletCards,
    label: "工资",
    value: "payroll",
  },
  {
    icon: UsersRound,
    label: "人员",
    value: "personnel",
  },
]

export function AppShell() {
  const [currentView, setCurrentView] = useState<AppView>("payroll")

  return (
    <ToastProvider>
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/82">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                Payroll Admin
              </p>
              <h1 className="text-[15px] font-medium tracking-tight text-foreground/90">
                工资与人员后台
              </h1>
            </div>

            <div className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 p-0.5">
              {viewOptions.map((option) => {
                const Icon = option.icon
                const isActive = currentView === option.value

                return (
                  <Button
                    key={option.value}
                    className={cn(
                      "h-7 min-w-0 rounded-sm px-2.5 text-sm shadow-none",
                      isActive
                        ? "bg-background text-foreground"
                        : "border-transparent bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                    onClick={() => setCurrentView(option.value)}
                    size="sm"
                    variant={isActive ? "secondary" : "ghost"}
                  >
                    <Icon className="size-3.5" />
                    <span className="font-medium">{option.label}</span>
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

      <ToastViewport />
    </ToastProvider>
  )
}
