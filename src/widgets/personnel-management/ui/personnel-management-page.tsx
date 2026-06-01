import { Search, SquarePen, Trash2, UserPlus, UsersRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Personnel } from "@/entities/personnel/api/personnel"
import type { CreatePersonnelValues } from "@/features/manage-personnel/model/schema"
import { CreateOrEditPersonnelDialog } from "@/features/manage-personnel/ui/create-or-edit-personnel-dialog"
import { maskSensitiveValue } from "@/shared/lib/formatters"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { useToastFeedback } from "@/shared/ui/toast"
import {
  EmptyPanel,
  LoadingState,
  SummaryTile,
} from "@/shared/ui/workspace-primitives"
import { usePersonnelManagementStore } from "@/widgets/personnel-management/model/use-personnel-management-store"

function matchesQuery(
  personnel: {
    idCardNumber: string | null
    name: string
    payrollCardNumber: string | null
    phoneNumber: string | null
  },
  query: string,
) {
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
  const [pendingDeletePersonnel, setPendingDeletePersonnel] =
    useState<Personnel | null>(null)

  const {
    clearFeedback,
    createPersonnelRecord,
    deletePersonnelRecord,
    dialogMode,
    editingPersonnel,
    errorMessage,
    hasInitialized,
    initialize,
    isDeleting,
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
      deletePersonnelRecord: state.deletePersonnelRecord,
      dialogMode: state.dialogMode,
      editingPersonnel: state.editingPersonnel,
      errorMessage: state.errorMessage,
      hasInitialized: state.hasInitialized,
      initialize: state.initialize,
      isDeleting: state.isDeleting,
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

  useToastFeedback({
    clearFeedback,
    errorMessage,
    notice,
  })

  const filteredPersonnel = useMemo(
    () => personnel.filter((item) => matchesQuery(item, query)),
    [personnel, query],
  )

  const summaryText = useMemo(() => {
    if (personnel.length > 0) {
      return `已收录 ${personnel.length} 位人员，可集中维护基础资料。`
    }

    return "先新增人员，后续即可在工资工作台中直接使用。"
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

  const handleDeleteIntent = (target: Personnel) => {
    setPendingDeletePersonnel(target)
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDeletePersonnel) {
      return
    }

    const didDelete = await deletePersonnelRecord(pendingDeletePersonnel.id)
    if (didDelete) {
      setPendingDeletePersonnel(null)
    }
  }

  return (
    <>
      <main className="px-4 py-6 text-foreground md:px-6">
        <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl space-y-4">
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

              <Button className="h-8 px-4 text-sm" size="sm" onClick={openCreateDialog}>
                <UserPlus className="size-3.5" />
                新增人员
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <SummaryTile
              icon={<UsersRound className="size-3.5" />}
              label="人员总数"
              value={`${personnel.length}`}
            />
            <SummaryTile
              icon={<Search className="size-3.5" />}
              label="当前筛选"
              value={`${filteredPersonnel.length}`}
            />
            {personnel.length > 0 ? (
              <div className="inline-flex items-center rounded-md px-1 text-sm text-muted-foreground/65">
                集中维护人员资料
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/55 p-3 shadow-inner md:p-4">
            <Card className="border-border/80 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                      人员资料列表
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {summaryText}
                    </CardDescription>
                  </div>

                  <label className="relative block w-full max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="h-10 w-full cursor-text rounded-md border border-input bg-background pr-3 pl-9 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
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
                  <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="bg-muted/70 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">姓名</th>
                          <th className="px-4 py-3 font-medium">性别</th>
                          <th className="px-4 py-3 font-medium">民族</th>
                          <th className="px-4 py-3 font-medium">联系电话</th>
                          <th className="px-4 py-3 font-medium">身份证号码</th>
                          <th className="px-4 py-3 font-medium">工资卡号</th>
                          <th className="px-4 py-3 text-right font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPersonnel.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t bg-background transition hover:bg-accent/25"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {item.name}
                            </td>
                            <td className="px-4 py-3">{item.gender || "-"}</td>
                            <td className="px-4 py-3">{item.ethnicity || "-"}</td>
                            <td className="px-4 py-3">{item.phoneNumber || "-"}</td>
                            <td className="px-4 py-3">
                              {maskSensitiveValue(item.idCardNumber)}
                            </td>
                            <td className="px-4 py-3">
                              {maskSensitiveValue(item.payrollCardNumber)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <SquarePen className="size-4" />
                                  编辑
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={isDeleting || isSubmitting}
                                  onClick={() => handleDeleteIntent(item)}
                                >
                                  <Trash2 className="size-4" />
                                  删除
                                </Button>
                              </div>
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
        </div>
      </main>

      {isDialogOpen ? (
        <CreateOrEditPersonnelDialog
          initialPersonnel={editingPersonnel}
          isBusy={isSubmitting}
          isDeleting={isDeleting}
          mode={dialogMode}
          onDelete={
            dialogMode === "edit" && editingPersonnel
              ? () => handleDeleteIntent(editingPersonnel)
              : undefined
          }
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          open={isDialogOpen}
          showDeleteAction={dialogMode === "edit"}
        />
      ) : null}

      {pendingDeletePersonnel ? (
        <ConfirmDialog
          confirmLabel="确认删除人员"
          description={`删除 ${pendingDeletePersonnel.name} 后，会同时移除其在全部工资表中的记录。`}
          isBusy={isDeleting}
          onConfirm={handleDeleteConfirm}
          onOpenChange={(open) => {
            if (!open) {
              setPendingDeletePersonnel(null)
            }
          }}
          open
          title="确认删除人员"
        />
      ) : null}
    </>
  )
}
