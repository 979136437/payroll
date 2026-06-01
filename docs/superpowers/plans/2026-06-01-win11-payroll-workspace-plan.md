# Win11 Payroll Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the payroll frontend into a Win11-style overview-plus-detail workspace while preserving the existing payroll sheet, personnel, and net-pay workflows.

**Architecture:** Extend the existing `zustand` workspace store with explicit view state, then split the current all-in-one workspace widget into focused page-level components for overview, detail, and dialogs. Reuse the current API layer and core table/dialog features, while refreshing shared UI primitives and page shells to deliver the Win11 visual system.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, Tailwind CSS 4, Base UI button primitives, TanStack Table, existing workspace store test runner

---

### Task 1: Add explicit view state to the workspace store

**Files:**
- Modify: `src/widgets/payroll-workspace/model/use-payroll-workspace-store.ts`
- Modify: `tests/payroll-workspace-store.test.ts`

- [ ] **Step 1: Write the failing store tests for overview/detail navigation**

Add the new reset shape and navigation assertions to `tests/payroll-workspace-store.test.ts`:

```ts
function resetStore() {
  usePayrollWorkspaceStore.setState({
    currentView: "overview",
    errorMessage: null,
    hasInitialized: false,
    isAddingPersonnel: false,
    isBootstrapping: false,
    isCreateSheetOpen: false,
    isCreatingPersonnel: false,
    isCreatingSheet: false,
    isDetailLoading: false,
    isPersonnelDialogOpen: false,
    isRemovingPersonnel: false,
    notice: null,
    personnel: [],
    pickerSelection: [],
    salaryDrafts: {},
    savingRecordIds: [],
    selectedPersonnelIds: [],
    selectedSheetId: null,
    sheetDetail: null,
    sheets: [],
  })
}

await runTest("initializeWorkspace stays on overview while selecting latest sheet", async () => {
  payrollWorkspaceApi.listPersonnel = async () => []
  payrollWorkspaceApi.listPayrollSheets = async () => [
    { id: 8, name: "2026 年 6 月工资表", personnelCount: 1, updatedAt: "200" },
  ]
  payrollWorkspaceApi.getPayrollSheetDetail = async () => ({
    records: [],
    sheet: { id: 8, name: "2026 年 6 月工资表", personnelCount: 1, updatedAt: "200" },
  })

  await usePayrollWorkspaceStore.getState().initializeWorkspace()

  const state = usePayrollWorkspaceStore.getState()
  assert.equal(state.currentView, "overview")
  assert.equal(state.selectedSheetId, 8)
})

await runTest("openSheetDetail enters detail view and keeps selected sheet", async () => {
  payrollWorkspaceApi.listPersonnel = async () => []
  payrollWorkspaceApi.listPayrollSheets = async () => [
    { id: 8, name: "2026 年 6 月工资表", personnelCount: 1, updatedAt: "200" },
  ]
  payrollWorkspaceApi.getPayrollSheetDetail = async () => ({
    records: [],
    sheet: { id: 8, name: "2026 年 6 月工资表", personnelCount: 1, updatedAt: "200" },
  })

  await usePayrollWorkspaceStore.getState().initializeWorkspace()
  await usePayrollWorkspaceStore.getState().openSheetDetail(8)

  const state = usePayrollWorkspaceStore.getState()
  assert.equal(state.currentView, "sheet-detail")
  assert.equal(state.selectedSheetId, 8)
})

await runTest("showOverview keeps sheet context while leaving detail mode", async () => {
  usePayrollWorkspaceStore.setState({
    currentView: "sheet-detail",
    selectedSheetId: 8,
  })

  usePayrollWorkspaceStore.getState().showOverview()

  const state = usePayrollWorkspaceStore.getState()
  assert.equal(state.currentView, "overview")
  assert.equal(state.selectedSheetId, 8)
})
```

- [ ] **Step 2: Run the store test script to verify it fails**

Run:

```bash
node scripts/run-payroll-workspace-store-test.mjs
```

Expected: FAIL because `currentView`, `openSheetDetail`, and `showOverview` do not exist yet.

- [ ] **Step 3: Add the minimal store view state and actions**

Update `src/widgets/payroll-workspace/model/use-payroll-workspace-store.ts` with an explicit view model:

```ts
export type PayrollWorkspaceView = "overview" | "sheet-detail"

type PayrollWorkspaceStore = {
  currentView: PayrollWorkspaceView
  errorMessage: string | null
  hasInitialized: boolean
  isAddingPersonnel: boolean
  isBootstrapping: boolean
  isCreateSheetOpen: boolean
  isCreatingPersonnel: boolean
  isCreatingSheet: boolean
  isDetailLoading: boolean
  isPersonnelDialogOpen: boolean
  isRemovingPersonnel: boolean
  notice: string | null
  personnel: Personnel[]
  pickerSelection: number[]
  salaryDrafts: Record<number, string>
  savingRecordIds: number[]
  selectedPersonnelIds: number[]
  selectedSheetId: number | null
  sheetDetail: PayrollSheetDetail | null
  sheets: PayrollSheetSummary[]
  openSheetDetail: (sheetId: number) => Promise<void>
  showOverview: () => void
  addSelectedPersonnelToSheet: () => Promise<void>
  clearFeedback: () => void
  createPersonnelRecord: (payload: CreatePersonnelPayload) => Promise<boolean>
  createSheet: (payload: CreatePayrollSheetPayload) => Promise<boolean>
  initializeWorkspace: () => Promise<void>
  refreshWorkspace: (preferredSheetId?: number | null) => Promise<void>
  removeSelectedPersonnelFromSheet: () => Promise<void>
  saveNetPay: (record: PayrollRecord) => Promise<void>
  selectSheet: (sheetId: number) => Promise<void>
  setCreateSheetOpen: (open: boolean) => void
  setPersonnelDialogOpen: (open: boolean) => void
  togglePickerSelection: (personnelId: number) => void
  toggleSelectedPersonnel: (personnelId: number) => void
  updateSalaryDraft: (recordId: number, value: string) => void
}

export const usePayrollWorkspaceStore = create<PayrollWorkspaceStore>((set, get) => ({
  currentView: "overview",
  errorMessage: null,
  hasInitialized: false,
  isAddingPersonnel: false,
  isBootstrapping: false,
  isCreateSheetOpen: false,
  isCreatingPersonnel: false,
  isCreatingSheet: false,
  isDetailLoading: false,
  isPersonnelDialogOpen: false,
  isRemovingPersonnel: false,
  notice: null,
  personnel: [],
  pickerSelection: [],
  salaryDrafts: {},
  savingRecordIds: [],
  selectedPersonnelIds: [],
  selectedSheetId: null,
  sheetDetail: null,
  sheets: [],

  async openSheetDetail(sheetId) {
    await get().selectSheet(sheetId)
    set({ currentView: "sheet-detail" })
  },

  showOverview() {
    set({ currentView: "overview" })
  },

  async createSheet(payload) {
    set({
      errorMessage: null,
      isCreatingSheet: true,
      notice: null,
    })

    try {
      const created = await payrollWorkspaceApi.createPayrollSheet(payload)

      set({
        currentView: "sheet-detail",
        isCreateSheetOpen: false,
        notice: "工资表已创建",
      })

      await get().refreshWorkspace(created.id)
      return true
    } catch (error) {
      set({
        errorMessage: readableError(error, "创建工资表失败"),
        notice: null,
      })
      return false
    } finally {
      set({ isCreatingSheet: false })
    }
  },
}))
```

Also update the `refreshWorkspace` branch that resolves no valid sheet:

```ts
if (nextSheetId === null) {
  set({
    currentView: "overview",
    isDetailLoading: false,
    pickerSelection: [],
    salaryDrafts: {},
    selectedPersonnelIds: [],
    sheetDetail: null,
  })
  return
}
```

- [ ] **Step 4: Run the store test script again**

Run:

```bash
node scripts/run-payroll-workspace-store-test.mjs
```

Expected: PASS for the new navigation assertions and the existing payroll workflow assertions.

- [ ] **Step 5: Commit**

```bash
git add tests/payroll-workspace-store.test.ts src/widgets/payroll-workspace/model/use-payroll-workspace-store.ts
git commit -m "feat(workspace): add overview and detail view state"
```

### Task 2: Split the workspace widget into shell and dialog components

**Files:**
- Create: `src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx`
- Create: `src/widgets/payroll-workspace/ui/payroll-workspace-dialogs.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-workspace-widget.tsx`

- [ ] **Step 1: Write the failing shell import contract**

Replace the body of `src/widgets/payroll-workspace/ui/payroll-workspace-widget.tsx` with imports that describe the new structure:

```tsx
import { useEffect } from "react"

import { PayrollWorkspaceShell } from "@/widgets/payroll-workspace/ui/payroll-workspace-shell"
import { PayrollWorkspaceDialogs } from "@/widgets/payroll-workspace/ui/payroll-workspace-dialogs"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

export function PayrollWorkspaceWidget() {
  const initializeWorkspace = usePayrollWorkspaceStore(
    (state) => state.initializeWorkspace,
  )

  useEffect(() => {
    void initializeWorkspace()
  }, [initializeWorkspace])

  return (
    <>
      <PayrollWorkspaceShell />
      <PayrollWorkspaceDialogs />
    </>
  )
}
```

- [ ] **Step 2: Run TypeScript verification to confirm the shell files are required**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL with module resolution errors for `payroll-workspace-shell` and `payroll-workspace-dialogs`.

- [ ] **Step 3: Create the shell and dialog modules**

Create `src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx`:

```tsx
import { useShallow } from "zustand/react/shallow"

import { LoadingState } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollOverviewPanel } from "@/widgets/payroll-workspace/ui/payroll-overview-panel"
import { PayrollSheetDetailPanel } from "@/widgets/payroll-workspace/ui/payroll-sheet-detail-panel"

export function PayrollWorkspaceShell() {
  const { currentView, isBootstrapping } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      currentView: state.currentView,
      isBootstrapping: state.isBootstrapping,
    })),
  )

  return (
    <main className="min-h-screen px-4 py-5 text-slate-900 md:px-6">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-7xl">
        {isBootstrapping ? (
          <LoadingState label="正在载入工资工作台..." />
        ) : currentView === "sheet-detail" ? (
          <PayrollSheetDetailPanel />
        ) : (
          <PayrollOverviewPanel />
        )}
      </div>
    </main>
  )
}
```

Create `src/widgets/payroll-workspace/ui/payroll-workspace-dialogs.tsx` by moving the existing lazy dialog logic out of the current monolithic widget:

```tsx
import { lazy, Suspense, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import type { CreatePayrollSheetValues } from "@/features/create-payroll-sheet/model/schema"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { LoadingState } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

const CreatePayrollSheetDialog = lazy(async () => {
  const module = await import(
    "@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog"
  )

  return { default: module.CreatePayrollSheetDialog }
})

const PersonnelPickerDialog = lazy(async () => {
  const module = await import(
    "@/features/manage-personnel/ui/personnel-picker-dialog"
  )

  return { default: module.PersonnelPickerDialog }
})

function DialogFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/12 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-xl shadow-slate-900/10">
        <LoadingState label="正在加载弹窗..." />
      </div>
    </div>
  )
}

export function PayrollWorkspaceDialogs() {
  const {
    addSelectedPersonnelToSheet,
    createPersonnelRecord,
    createSheet,
    setCreateSheetOpen,
    setPersonnelDialogOpen,
    togglePickerSelection,
  } = usePayrollWorkspaceStore((state) => ({
    addSelectedPersonnelToSheet: state.addSelectedPersonnelToSheet,
    createPersonnelRecord: state.createPersonnelRecord,
    createSheet: state.createSheet,
    setCreateSheetOpen: state.setCreateSheetOpen,
    setPersonnelDialogOpen: state.setPersonnelDialogOpen,
    togglePickerSelection: state.togglePickerSelection,
  }))

  const {
    isCreateSheetOpen,
    isPersonnelDialogOpen,
    personnel,
    pickerSelection,
    selectedSheetId,
    sheetDetail,
    sheets,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      isCreateSheetOpen: state.isCreateSheetOpen,
      isPersonnelDialogOpen: state.isPersonnelDialogOpen,
      personnel: state.personnel,
      pickerSelection: state.pickerSelection,
      selectedSheetId: state.selectedSheetId,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
    })),
  )

  const currentSheetPersonIds = useMemo(
    () =>
      new Set((sheetDetail?.records ?? []).map((record) => record.personnelId)),
    [sheetDetail],
  )
  const pickerSelectionSet = useMemo(
    () => new Set(pickerSelection),
    [pickerSelection],
  )

  const handleCreateSheet = async (values: CreatePayrollSheetValues) =>
    createSheet({
      name: values.name,
      sourceSheetId: values.sourceSheetId ? Number(values.sourceSheetId) : null,
    })

  const handleCreatePersonnel = async (values: CreatePersonnelValues) =>
    createPersonnelRecord({
      name: values.name,
      jobType: values.jobType || null,
      phoneNumber: values.phoneNumber || null,
    })

  return (
    <Suspense fallback={<DialogFallback />}>
      {isCreateSheetOpen ? (
        <CreatePayrollSheetDialog
          isBusy={false}
          onOpenChange={setCreateSheetOpen}
          onSubmit={handleCreateSheet}
          open={isCreateSheetOpen}
          sheets={sheets}
        />
      ) : null}
      {isPersonnelDialogOpen ? (
        <PersonnelPickerDialog
          currentSheetPersonIds={currentSheetPersonIds}
          isBusy={selectedSheetId === null}
          onAddSelected={addSelectedPersonnelToSheet}
          onCreatePersonnel={handleCreatePersonnel}
          onOpenChange={setPersonnelDialogOpen}
          onToggleSelection={togglePickerSelection}
          open={isPersonnelDialogOpen}
          personnel={personnel}
          pickerSelection={pickerSelection}
          pickerSelectionSet={pickerSelectionSet}
        />
      ) : null}
    </Suspense>
  )
}
```

- [ ] **Step 4: Run TypeScript verification again**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL only for the still-missing `PayrollOverviewPanel` and `PayrollSheetDetailPanel` modules. The shell and dialog modules should resolve cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/payroll-workspace/ui/payroll-workspace-widget.tsx src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx src/widgets/payroll-workspace/ui/payroll-workspace-dialogs.tsx
git commit -m "refactor(workspace): split shell and dialogs"
```

### Task 3: Build the overview page and payroll sheet browser

**Files:**
- Create: `src/widgets/payroll-workspace/ui/payroll-overview-panel.tsx`
- Create: `src/widgets/payroll-workspace/ui/payroll-sheet-browser.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-sheet-list.tsx`

- [ ] **Step 1: Write the failing overview import contract**

Update `src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx` so the overview branch expects a dedicated panel:

```tsx
import { PayrollOverviewPanel } from "@/widgets/payroll-workspace/ui/payroll-overview-panel"
import { PayrollSheetDetailPanel } from "@/widgets/payroll-workspace/ui/payroll-sheet-detail-panel"
```

Then add the overview card browser usage inside the panel skeleton:

```tsx
import { PayrollSheetBrowser } from "@/widgets/payroll-workspace/ui/payroll-sheet-browser"

export function PayrollOverviewPanel() {
  return (
    <section className="flex min-h-full flex-col gap-6">
      <PayrollSheetBrowser />
    </section>
  )
}
```

- [ ] **Step 2: Run TypeScript verification to confirm the overview files are missing**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL because `payroll-overview-panel.tsx` and `payroll-sheet-browser.tsx` do not exist yet.

- [ ] **Step 3: Create the overview panel and browser components**

Create `src/widgets/payroll-workspace/ui/payroll-sheet-browser.tsx`:

```tsx
import { FolderOpen, Plus } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimestamp } from "@/shared/lib/formatters"
import {
  EmptyPanel,
  MessageBar,
  SummaryTile,
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {errorMessage ? <MessageBar variant="error">{errorMessage}</MessageBar> : null}
      {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}
      {sheets.map((sheet) => (
        <Card
          key={sheet.id}
          className="border-white/70 bg-white/78 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-md"
        >
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200/80">
                <FolderOpen className="size-4" />
                工资资源
              </div>
              <CardTitle className="text-xl font-semibold text-slate-950">
                {sheet.name}
              </CardTitle>
            </div>
            <SummaryTile
              icon={<Plus className="size-4" />}
              label="人数"
              value={`${sheet.personnelCount}`}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              最近更新 {formatTimestamp(sheet.updatedAt)}
            </p>
            <Button
              className="h-10 rounded-full px-5"
              onClick={() =>
                startTransition(() => {
                  void openSheetDetail(sheet.id)
                })
              }
            >
              打开工资表
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

Create `src/widgets/payroll-workspace/ui/payroll-overview-panel.tsx`:

```tsx
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
        sheetCount: state.sheets.length,
        setCreateSheetOpen: state.setCreateSheetOpen,
      })),
    )

  return (
    <section className="flex min-h-full flex-col gap-6">
      <div className="rounded-[32px] border border-white/65 bg-white/68 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium tracking-[0.22em] text-slate-500 uppercase">
              Payroll Workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Win11 风格工资工作台
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              先从总览主页进入，再按工资表切换到详情编辑工作台，保持节奏清晰、操作集中。
            </p>
          </div>
          <Button className="h-11 rounded-full px-6" onClick={() => setCreateSheetOpen(true)}>
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
```

Then restyle `src/widgets/payroll-workspace/ui/payroll-sheet-list.tsx` for embedded detail navigation only:

```tsx
export function PayrollSheetList({
  isLoading,
  mode = "embedded",
  onCreate,
  onCreateIntent,
  onSelect,
  selectedSheetId,
  sheets,
}: PayrollSheetListProps) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-[28px] border border-white/65 bg-white/72 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-2 pt-2">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
            Sheets
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">工资表导航</h2>
        </div>
        <Button
          size="sm"
          className="rounded-full px-4"
          onClick={onCreate}
          onFocus={onCreateIntent}
          onMouseEnter={onCreateIntent}
        >
          新建
        </Button>
      </div>
      {isLoading ? (
        <LoadingState label="正在读取工资表..." />
      ) : (
        <div className="space-y-2">
          {sheets.map((sheet) => {
            const isActive = sheet.id === selectedSheetId

            return (
              <button
                key={sheet.id}
                type="button"
                className={cn(
                  "w-full rounded-[24px] border px-4 py-3 text-left transition",
                  isActive
                    ? "border-sky-300/80 bg-sky-50/80 shadow-[0_8px_24px_rgba(56,189,248,0.14)]"
                    : "border-white/70 bg-white/70 hover:border-slate-200 hover:bg-white",
                )}
                onClick={() => onSelect(sheet.id)}
              >
                <p className="text-sm font-medium text-slate-950">{sheet.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  最近更新 {formatTimestamp(sheet.updatedAt)}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run TypeScript verification again**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL only for the still-missing `PayrollSheetDetailPanel` module. The overview view and browser components should resolve cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/payroll-workspace/ui/payroll-overview-panel.tsx src/widgets/payroll-workspace/ui/payroll-sheet-browser.tsx src/widgets/payroll-workspace/ui/payroll-sheet-list.tsx
git commit -m "feat(workspace): add overview home and sheet browser"
```

### Task 4: Build the detail workspace shell and record toolbar

**Files:**
- Create: `src/widgets/payroll-workspace/ui/payroll-sheet-detail-panel.tsx`
- Create: `src/widgets/payroll-workspace/ui/payroll-record-toolbar.tsx`
- Modify: `src/features/edit-payroll-record/ui/payroll-record-table.tsx`

- [ ] **Step 1: Write the failing detail import contract**

Update `src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx` so the detail branch requires a dedicated panel:

```tsx
import { PayrollSheetDetailPanel } from "@/widgets/payroll-workspace/ui/payroll-sheet-detail-panel"

{currentView === "sheet-detail" ? <PayrollSheetDetailPanel /> : <PayrollOverviewPanel />}
```

Then reference a toolbar component from the detail panel skeleton:

```tsx
import { PayrollRecordToolbar } from "@/widgets/payroll-workspace/ui/payroll-record-toolbar"

export function PayrollSheetDetailPanel() {
  return (
    <section className="flex min-h-full flex-col gap-4">
      <PayrollRecordToolbar />
    </section>
  )
}
```

- [ ] **Step 2: Run TypeScript verification to confirm the detail files are missing**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL because `payroll-sheet-detail-panel.tsx` and `payroll-record-toolbar.tsx` do not exist yet.

- [ ] **Step 3: Create the detail panel and toolbar**

Create `src/widgets/payroll-workspace/ui/payroll-record-toolbar.tsx`:

```tsx
import { Plus, Trash2 } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import { MessageBar } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"

function preloadPersonnelPickerDialog() {
  void import("@/features/manage-personnel/ui/personnel-picker-dialog")
}

export function PayrollRecordToolbar() {
  const {
    errorMessage,
    isRemovingPersonnel,
    notice,
    removeSelectedPersonnelFromSheet,
    selectedPersonnelIds,
    selectedSheetId,
    setPersonnelDialogOpen,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      errorMessage: state.errorMessage,
      isRemovingPersonnel: state.isRemovingPersonnel,
      notice: state.notice,
      removeSelectedPersonnelFromSheet: state.removeSelectedPersonnelFromSheet,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setPersonnelDialogOpen: state.setPersonnelDialogOpen,
    })),
  )

  return (
    <div className="rounded-[28px] border border-white/65 bg-white/72 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
            Records
          </p>
          <p className="text-sm text-slate-600">
            当前选中 {selectedPersonnelIds.length} 人
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full px-4"
            disabled={selectedSheetId === null}
            onClick={() =>
              startTransition(() => {
                preloadPersonnelPickerDialog()
                setPersonnelDialogOpen(true)
              })
            }
            onFocus={preloadPersonnelPickerDialog}
            onMouseEnter={preloadPersonnelPickerDialog}
          >
            <Plus className="size-4" />
            添加人员
          </Button>
          <Button
            variant="outline"
            className="rounded-full px-4"
            disabled={selectedSheetId === null || selectedPersonnelIds.length === 0 || isRemovingPersonnel}
            onClick={() => {
              void removeSelectedPersonnelFromSheet()
            }}
          >
            <Trash2 className="size-4" />
            移除选中
          </Button>
        </div>
      </div>
      {errorMessage ? <MessageBar variant="error">{errorMessage}</MessageBar> : null}
      {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}
    </div>
  )
}
```

Create `src/widgets/payroll-workspace/ui/payroll-sheet-detail-panel.tsx`:

```tsx
import { ArrowLeft, BadgePlus, CircleDollarSign, UsersRound } from "lucide-react"
import { startTransition } from "react"
import { useShallow } from "zustand/react/shallow"

import { PayrollRecordTable } from "@/features/edit-payroll-record/ui/payroll-record-table"
import { SummaryTile } from "@/shared/ui/workspace-primitives"
import { usePayrollWorkspaceStore } from "@/widgets/payroll-workspace/model/use-payroll-workspace-store"
import { PayrollRecordToolbar } from "@/widgets/payroll-workspace/ui/payroll-record-toolbar"
import { PayrollSheetList } from "@/widgets/payroll-workspace/ui/payroll-sheet-list"
import { Button } from "@/components/ui/button"

function preloadCreatePayrollSheetDialog() {
  void import("@/features/create-payroll-sheet/ui/create-payroll-sheet-dialog")
}

export function PayrollSheetDetailPanel() {
  const {
    isCreatingPersonnel,
    isCreatingSheet,
    isDetailLoading,
    isRemovingPersonnel,
    openSheetDetail,
    salaryDrafts,
    saveNetPay,
    selectedPersonnelIds,
    selectedSheetId,
    setCreateSheetOpen,
    sheetDetail,
    sheets,
    showOverview,
    toggleSelectedPersonnel,
    updateSalaryDraft,
    savingRecordIds,
  } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      isCreatingPersonnel: state.isCreatingPersonnel,
      isCreatingSheet: state.isCreatingSheet,
      isDetailLoading: state.isDetailLoading,
      isRemovingPersonnel: state.isRemovingPersonnel,
      openSheetDetail: state.openSheetDetail,
      salaryDrafts: state.salaryDrafts,
      saveNetPay: state.saveNetPay,
      selectedPersonnelIds: state.selectedPersonnelIds,
      selectedSheetId: state.selectedSheetId,
      setCreateSheetOpen: state.setCreateSheetOpen,
      sheetDetail: state.sheetDetail,
      sheets: state.sheets,
      showOverview: state.showOverview,
      toggleSelectedPersonnel: state.toggleSelectedPersonnel,
      updateSalaryDraft: state.updateSalaryDraft,
      savingRecordIds: state.savingRecordIds,
    })),
  )

  const selectedSheetSummary =
    sheets.find((sheet) => sheet.id === selectedSheetId) ?? sheetDetail?.sheet ?? null
  const records = sheetDetail?.records ?? []
  const savingRecordIdSet = new Set(savingRecordIds)
  const selectedPersonnelIdSet = new Set(selectedPersonnelIds)

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-[32px] border border-white/65 bg-white/70 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-9 rounded-full px-4" onClick={showOverview}>
              <ArrowLeft className="size-4" />
              返回总览
            </Button>
            <div className="space-y-2">
              <p className="text-sm font-medium tracking-[0.22em] text-slate-500 uppercase">
                Payroll Detail
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {selectedSheetSummary?.name ?? "工资表详情"}
              </h1>
              <p className="text-sm leading-7 text-slate-600">
                在双栏工作台里维护工资表导航、人员记录和实发工资。
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile
              icon={<UsersRound className="size-4" />}
              label="人员记录"
              value={`${records.length}`}
            />
            <SummaryTile
              icon={<BadgePlus className="size-4" />}
              label="当前选中"
              value={`${selectedPersonnelIds.length}`}
            />
            <SummaryTile
              icon={<CircleDollarSign className="size-4" />}
              label="保存中"
              value={`${savingRecordIds.length}`}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 xl:items-start">
        <aside className="w-full xl:max-w-sm">
          <PayrollSheetList
            isLoading={isCreatingSheet}
            mode="embedded"
            onCreate={() => {
              preloadCreatePayrollSheetDialog()
              setCreateSheetOpen(true)
            }}
            onCreateIntent={preloadCreatePayrollSheetDialog}
            onSelect={(sheetId) =>
              startTransition(() => {
                void openSheetDetail(sheetId)
              })
            }
            selectedSheetId={selectedSheetId}
            sheets={sheets}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PayrollRecordToolbar />
          <PayrollRecordTable
            drafts={salaryDrafts}
            onDraftChange={updateSalaryDraft}
            onSave={saveNetPay}
            onToggleSelection={toggleSelectedPersonnel}
            records={records}
            savingRecordIdSet={savingRecordIdSet}
            selectedPersonnelIdSet={selectedPersonnelIdSet}
          />
        </div>
      </div>
    </section>
  )
}
```

Then update `src/features/edit-payroll-record/ui/payroll-record-table.tsx` so the table surface fits the new detail shell:

```tsx
export function PayrollRecordTable({
  drafts,
  onDraftChange,
  onSave,
  onToggleSelection,
  records,
  savingRecordIdSet,
  selectedPersonnelIdSet,
}: PayrollRecordTableProps) {
  const meta = useMemo(
    () => ({
      payrollRecordTable: {
        drafts,
        onDraftChange,
        onSave,
        onToggleSelection,
        savingRecordIdSet,
        selectedPersonnelIdSet,
      },
    }),
    [
      drafts,
      onDraftChange,
      onSave,
      onToggleSelection,
      savingRecordIdSet,
      selectedPersonnelIdSet,
    ],
  )

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta,
  })

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/65 bg-white/74 shadow-[0_18px_48px_rgba(15,23,42,0.07)] backdrop-blur-md">
      <table className="min-w-full border-collapse">
        <thead className="bg-slate-50/90">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-4 text-left text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-200/70">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="bg-white/55 hover:bg-white/80">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3.5 text-sm text-slate-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run TypeScript and store verification**

Run:

```bash
pnpm exec tsc --noEmit
node scripts/run-payroll-workspace-store-test.mjs
```

Expected: PASS. The detail shell should compile and the store flows should remain green.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/payroll-workspace/ui/payroll-sheet-detail-panel.tsx src/widgets/payroll-workspace/ui/payroll-record-toolbar.tsx src/features/edit-payroll-record/ui/payroll-record-table.tsx
git commit -m "feat(workspace): add detail workspace shell"
```

### Task 5: Apply the Win11 visual system across shared primitives

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/shared/ui/workspace-primitives.tsx`

- [ ] **Step 1: Write the failing visual token contract**

Change `src/index.css` so the theme expects the Win11 token set:

```css
:root {
  --background: oklch(0.985 0.006 235);
  --foreground: oklch(0.23 0.02 255);
  --card: oklch(1 0 0 / 0.72);
  --card-foreground: oklch(0.22 0.02 255);
  --primary: oklch(0.63 0.12 233);
  --primary-foreground: oklch(0.985 0.01 235);
  --secondary: oklch(0.95 0.01 235);
  --secondary-foreground: oklch(0.28 0.02 255);
  --muted: oklch(0.96 0.008 235);
  --muted-foreground: oklch(0.52 0.02 255);
  --border: oklch(0.9 0.01 235 / 0.9);
  --input: oklch(0.91 0.01 235 / 0.95);
  --ring: oklch(0.68 0.11 235 / 0.35);
  --destructive: oklch(0.62 0.19 25);
  --radius: 1.5rem;
}
```

- [ ] **Step 2: Run lint to surface any class or formatting regressions introduced during the visual refactor**

Run:

```bash
pnpm lint
```

Expected: FAIL if the shared primitive updates are incomplete or if class strings drift from the rest of the refactor.

- [ ] **Step 3: Update the shared primitives to the Win11 surface language**

Update `src/index.css`:

```css
body {
  @apply min-h-screen bg-background text-foreground antialiased;
  margin: 0;
  background-image:
    radial-gradient(circle at top, rgba(110, 165, 255, 0.18), transparent 28%),
    radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.78), transparent 22%),
    linear-gradient(160deg, rgba(246, 249, 255, 0.96), rgba(236, 242, 252, 0.9));
  background-attachment: fixed;
}
```

Update `src/components/ui/button.tsx`:

```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(59,130,246,0.24)] hover:bg-primary/92",
        outline:
          "border-white/70 bg-white/80 text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:bg-white",
        secondary:
          "bg-secondary/90 text-secondary-foreground shadow-[0_6px_18px_rgba(15,23,42,0.04)] hover:bg-secondary",
        ghost: "text-slate-700 hover:bg-white/75",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/18 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-4",
        xs: "h-7 gap-1 px-2.5 text-xs",
        sm: "h-8 gap-1 px-3 text-[0.8rem]",
        lg: "h-11 gap-1.5 px-5",
        icon: "size-9",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
```

Update `src/components/ui/card.tsx`:

```tsx
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-[28px] border border-white/65 bg-card py-4 text-sm text-card-foreground shadow-[0_18px_48px_rgba(15,23,42,0.07)] backdrop-blur-md",
        className,
      )}
      {...props}
    />
  )
}
```

Update `src/shared/ui/workspace-primitives.tsx`:

```tsx
export function MessageBar({ children, variant }: MessageBarProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] px-4 py-3 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.04)]",
        variant === "error"
          ? "border border-rose-200/80 bg-rose-50/88 text-rose-700"
          : "border border-sky-200/80 bg-sky-50/88 text-slate-700",
      )}
    >
      {children}
    </div>
  )
}

export function EmptyPanel({
  actionLabel,
  description,
  onAction,
  onActionIntent,
  title,
}: EmptyPanelProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[32px] border border-white/70 bg-white/72 px-6 py-14 text-center shadow-[0_24px_72px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <div className="max-w-md space-y-3">
        <p className="text-2xl font-semibold tracking-tight text-slate-950">{title}</p>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </div>
      <Button
        className="mt-6 rounded-full px-5"
        onClick={onAction}
        onFocus={onActionIntent}
        onMouseEnter={onActionIntent}
      >
        {actionLabel}
      </Button>
    </div>
  )
}

export function SummaryTile({ icon, label, value }: SummaryTileProps) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/78 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur-md">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/85 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-white/70">
        {icon}
        {label}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run full frontend verification**

Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
node scripts/run-payroll-workspace-store-test.mjs
```

Expected: PASS. The visual refresh should not break typing, linting, or store behavior.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/ui/button.tsx src/components/ui/card.tsx src/shared/ui/workspace-primitives.tsx
git commit -m "feat(workspace): apply win11 visual system"
```

### Task 6: Run end-to-end verification and polish regressions

**Files:**
- Modify: `src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-workspace-dialogs.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-overview-panel.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-sheet-detail-panel.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-record-toolbar.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-sheet-browser.tsx`
- Modify: `src/widgets/payroll-workspace/ui/payroll-sheet-list.tsx`
- Modify: `src/features/edit-payroll-record/ui/payroll-record-table.tsx`
- Modify: `src/widgets/payroll-workspace/model/use-payroll-workspace-store.ts`
- Modify: `tests/payroll-workspace-store.test.ts`

- [ ] **Step 1: Run the final verification suite**

Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
node scripts/run-payroll-workspace-store-test.mjs
pnpm build
```

Expected: PASS

- [ ] **Step 2: Run the local app for manual UI verification**

Run:

```bash
pnpm dev
```

Expected manual checks:

- app opens into the overview home
- overview shows summary tiles and payroll sheet cards
- opening a payroll sheet enters the dual-column detail workspace
- returning to overview does not lose the selected sheet context
- creating a payroll sheet opens a usable detail workspace
- creating personnel, adding personnel, removing personnel, and saving net pay still work

- [ ] **Step 3: Fix only the regressions surfaced by verification**

If one of the view or dialog boundaries needs a narrow follow-up, make targeted edits like:

```tsx
export function PayrollWorkspaceShell() {
  const { currentView, isBootstrapping } = usePayrollWorkspaceStore(
    useShallow((state) => ({
      currentView: state.currentView,
      isBootstrapping: state.isBootstrapping,
    })),
  )

  if (isBootstrapping) {
    return (
      <main className="min-h-screen px-4 py-5 text-slate-900 md:px-6">
        <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-7xl">
          <LoadingState label="正在载入工资工作台..." />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-5 text-slate-900 md:px-6">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-7xl">
        {currentView === "sheet-detail" ? (
          <PayrollSheetDetailPanel />
        ) : (
          <PayrollOverviewPanel />
        )}
      </div>
    </main>
  )
}
```

Keep follow-up edits narrow and evidence-driven. Do not widen scope beyond regressions exposed by the verification suite or the manual checks above.

- [ ] **Step 4: Re-run the full verification suite**

Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
node scripts/run-payroll-workspace-store-test.mjs
pnpm build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/shared/ui/workspace-primitives.tsx src/components/ui/button.tsx src/components/ui/card.tsx src/widgets/payroll-workspace/model/use-payroll-workspace-store.ts src/widgets/payroll-workspace/ui/payroll-workspace-widget.tsx src/widgets/payroll-workspace/ui/payroll-workspace-shell.tsx src/widgets/payroll-workspace/ui/payroll-workspace-dialogs.tsx src/widgets/payroll-workspace/ui/payroll-overview-panel.tsx src/widgets/payroll-workspace/ui/payroll-sheet-browser.tsx src/widgets/payroll-workspace/ui/payroll-sheet-detail-panel.tsx src/widgets/payroll-workspace/ui/payroll-record-toolbar.tsx src/widgets/payroll-workspace/ui/payroll-sheet-list.tsx src/features/edit-payroll-record/ui/payroll-record-table.tsx tests/payroll-workspace-store.test.ts
git commit -m "feat(workspace): redesign payroll workspace for win11"
```
