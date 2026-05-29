import { ArrowRight, MonitorCog, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-5xl border-white/50 bg-white/80 shadow-2xl shadow-slate-900/8 backdrop-blur">
        <CardHeader className="gap-6 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <MonitorCog className="size-4" />
              Tauri + React + shadcn/ui
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                Payroll desktop scaffold is ready for the next layer.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-slate-600">
                This starter keeps the first release intentionally lean: a
                verified Tauri shell, a Vite React frontend, Tailwind CSS, and
                shadcn/ui components wired together in one desktop-ready entry.
              </CardDescription>
            </div>
          </div>
          <Button className="h-11 rounded-full px-5 text-sm font-semibold">
            Open next milestone
            <ArrowRight className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 px-4 py-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/85 p-5">
            <p className="text-sm font-medium text-slate-950">Runtime</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tauri 2 hosts the app shell while Vite serves the frontend during
              development and produces the static bundle for builds.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-5">
            <p className="text-sm font-medium text-slate-950">UI foundation</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tailwind CSS and shadcn/ui are configured with project aliases so
              future screens can stay composable and consistent.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-5">
            <p className="text-sm font-medium text-slate-950">Business path</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Spreadsheet import, payroll logic, and local commands are still
              intentionally deferred until the shell is stable.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start justify-between gap-4 border-t border-border/60 bg-transparent md:flex-row md:items-center">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <WalletCards className="size-4 text-primary" />
            Current app identity: <span className="font-medium text-slate-950">payroll</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Ready for payroll workflows, import tooling, and local desktop
            actions.
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}

export default App
