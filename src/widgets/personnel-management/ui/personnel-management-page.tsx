import { Search, SquarePen, UserPlus, UsersRound } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { CreateOrEditPersonnelDialog } from "@/features/manage-personnel/ui/create-or-edit-personnel-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { maskSensitiveValue } from "@/shared/lib/formatters"
import {
  EmptyPanel,
  LoadingState,
  MessageBar,
  SummaryTile,
} from "@/shared/ui/workspace-primitives"
import { usePersonnelManagementStore } from "@/widgets/personnel-management/model/use-personnel-management-store"

function matchesQuery(personnel: {
  idCardNumber: string | null
  name: string
  payrollCardNumber: string | null
  phoneNumber: string | null
}, query: string) {
  if (!query) {
    return true
  }

  return [
    personnel.name,
    personnel.phoneNumber ?? "",
    personnel.idCardNumber ?? "",
    personnel.payrollCardNumber ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query.toLowerCase())
}

export function PersonnelManagementPage() {
  const {
    clearFeedback,
    createPersonnelRecord,
    dialogMode,
    editingPersonnel,
    errorMessage,
    hasInitialized,
    initialize,
    isDialogOpen,
    isLoading,
    isSubmitting,
    notice,
    openCreateDialog,
    openEditDialog,
    personnel,
    query,
    setDialogOpen,
    setQuery,
    updatePersonnelRecord,
  } = usePersonnelManagementStore(
    useShallow((state) => ({
      clearFeedback: state.clearFeedback,
      createPersonnelRecord: state.createPersonnelRecord,
      dialogMode: state.dialogMode,
      editingPersonnel: state.editingPersonnel,
      errorMessage: state.errorMessage,
      hasInitialized: state.hasInitialized,
      initialize: state.initialize,
      isDialogOpen: state.isDialogOpen,
      isLoading: state.isLoading,
      isSubmitting: state.isSubmitting,
      notice: state.notice,
      openCreateDialog: state.openCreateDialog,
      openEditDialog: state.openEditDialog,
      personnel: state.personnel,
      query: state.query,
      setDialogOpen: state.setDialogOpen,
      setQuery: state.setQuery,
      updatePersonnelRecord: state.updatePersonnelRecord,
    })),
  )

  useEffect(() => {
    if (!hasInitialized) {
      void initialize()
    }
  }, [hasInitialized, initialize])

  const filteredPersonnel = useMemo(
    () => personnel.filter((item) => matchesQuery(item, query)),
    [personnel, query],
  )

  const lastUpdated = useMemo(() => {
    const latest = personnel[0]
    return latest ? `当前已收录 ${personnel.length} 位人员，可集中维护基础资料。` : "先新增人员，后续可在工资工作台中直接使用。"
  }, [personnel])

  const handleSubmit = async (values: CreatePersonnelValues) => {
    const payload = {
      bankName: values.bankName || null,
      ethnicity: values.ethnicity || null,
      gender: values.gender || null,
      idCardNumber: values.idCardNumber || null,
      name: values.name,
      nativePlace: values.nativePlace || null,
      payrollCardNumber: values.payrollCardNumber || null,
      phoneNumber: values.phoneNumber || null,
    }

    if (dialogMode === "edit" && editingPersonnel) {
      return updatePersonnelRecord(editingPersonnel.id, payload)
    }

    return createPersonnelRecord(payload)
  }

  return (
    <>
      <main className="px-4 py-6 text-foreground md:px-6">
        <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Personnel Management
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  人员管理
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  统一维护姓名、身份信息与联系方式，新增后可直接进入工资工作台复用。
                </p>
              </div>

              <Button className="px-6" onClick={openCreateDialog}>
                <UserPlus className="size-4" />
                新增人员
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile
              icon={<UsersRound className="size-4" />}
              label="人员总数"
              value={`${personnel.length}`}
            />
            <SummaryTile
              icon={<Search className="size-4" />}
              label="当前筛选"
              value={`${filteredPersonnel.length}`}
            />
            <SummaryTile
              icon={<UserPlus className="size-4" />}
              label="页面说明"
              value={personnel.length > 0 ? "集中维护人员资料" : "从新增开始建立人员库"}
            />
          </div>

          <Card>
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    人员资料列表
                  </CardTitle>
                  <CardDescription>{lastUpdated}</CardDescription>
                </div>

                <label className="relative block w-full max-w-sm">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-10 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    onChange={(event) => {
                      clearFeedback()
                      setQuery(event.target.value)
                    }}
                    placeholder="搜索姓名、联系电话、身份证号、工资卡号"
                    value={query}
                  />
                </label>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-4">
              {errorMessage ? <MessageBar variant="error">{errorMessage}</MessageBar> : null}
              {notice ? <MessageBar variant="notice">{notice}</MessageBar> : null}

              {isLoading ? (
                <LoadingState label="正在读取人员列表..." />
              ) : filteredPersonnel.length === 0 ? (
                personnel.length === 0 ? (
                  <EmptyPanel
                    actionLabel="新增人员"
                    description="先建立人员资料，后续即可在工资工作台中直接选用。"
                    onAction={openCreateDialog}
                    title="还没有人员资料"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
                    没有匹配当前搜索条件的人员。
                  </div>
                )
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">姓名</th>
                        <th className="px-4 py-3 font-medium">性别</th>
                        <th className="px-4 py-3 font-medium">民族</th>
                        <th className="px-4 py-3 font-medium">籍贯</th>
                        <th className="px-4 py-3 font-medium">联系电话</th>
                        <th className="px-4 py-3 font-medium">身份证号码</th>
                        <th className="px-4 py-3 font-medium">工资卡号</th>
                        <th className="px-4 py-3 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPersonnel.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t bg-background transition hover:bg-accent/30"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {item.name}
                          </td>
                          <td className="px-4 py-3">{item.gender || "—"}</td>
                          <td className="px-4 py-3">{item.ethnicity || "—"}</td>
                          <td className="px-4 py-3">{item.nativePlace || "—"}</td>
                          <td className="px-4 py-3">{item.phoneNumber || "—"}</td>
                          <td className="px-4 py-3">{maskSensitiveValue(item.idCardNumber)}</td>
                          <td className="px-4 py-3">
                            {maskSensitiveValue(item.payrollCardNumber)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(item)}
                            >
                              <SquarePen className="size-4" />
                              编辑
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {isDialogOpen ? (
        <CreateOrEditPersonnelDialog
          initialPersonnel={editingPersonnel}
          isBusy={isSubmitting}
          mode={dialogMode}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          open={isDialogOpen}
        />
      ) : null}
    </>
  )
}
