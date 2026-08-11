"use client";

import { useState, useEffect, useMemo, useRef, useId, useReducer } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { personnelApi } from "@/lib/api";
import type { Personnel } from "@/lib/types";
import {
  Search,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPersonnelIds?: number[];
  onConfirm: (params: {
    personnelIds: number[];
    defaultNetPay?: number;
    perPersonNetPay?: Record<number, number>;
  }) => Promise<void>;
  title?: string;
  description?: string;
};

type PickerDraftState = {
  pendingIds: number[];
  pendingSelectionIds: Set<number>;
  search: string;
  unifiedNetPay: string;
  perPersonNetPay: Record<number, string>;
};

type PickerDraftAction =
  | { type: "reset" }
  | { type: "addPersonnel"; personnelId: number }
  | { type: "removePersonnel"; personnelId: number }
  | { type: "removeSelected" }
  | { type: "toggleSelection"; personnelId: number }
  | { type: "setSelection"; personnelIds: number[] }
  | { type: "setSearch"; value: string }
  | { type: "setUnifiedNetPay"; value: string }
  | { type: "setPersonnelNetPay"; personnelId: number; value: string };

const createPickerDraftState = (): PickerDraftState => ({
  pendingIds: [],
  pendingSelectionIds: new Set(),
  search: "",
  unifiedNetPay: "",
  perPersonNetPay: {},
});

function pickerDraftReducer(
  state: PickerDraftState,
  action: PickerDraftAction
): PickerDraftState {
  switch (action.type) {
    case "reset":
      return createPickerDraftState();
    case "addPersonnel":
      return {
        ...state,
        pendingIds: [...state.pendingIds, action.personnelId],
      };
    case "removePersonnel": {
      const pendingSelectionIds = new Set(state.pendingSelectionIds);
      pendingSelectionIds.delete(action.personnelId);
      return {
        ...state,
        pendingIds: state.pendingIds.filter((id) => id !== action.personnelId),
        pendingSelectionIds,
      };
    }
    case "removeSelected":
      return {
        ...state,
        pendingIds: state.pendingIds.filter(
          (id) => !state.pendingSelectionIds.has(id)
        ),
        pendingSelectionIds: new Set(),
      };
    case "toggleSelection": {
      const pendingSelectionIds = new Set(state.pendingSelectionIds);
      if (pendingSelectionIds.has(action.personnelId)) {
        pendingSelectionIds.delete(action.personnelId);
      } else {
        pendingSelectionIds.add(action.personnelId);
      }
      return { ...state, pendingSelectionIds };
    }
    case "setSelection":
      return {
        ...state,
        pendingSelectionIds: new Set(action.personnelIds),
      };
    case "setSearch":
      return { ...state, search: action.value };
    case "setUnifiedNetPay": {
      const perPersonNetPay = { ...state.perPersonNetPay };
      if (action.value !== "") {
        state.pendingIds.forEach((id) => {
          perPersonNetPay[id] = action.value;
        });
      }
      return {
        ...state,
        unifiedNetPay: action.value,
        perPersonNetPay,
      };
    }
    case "setPersonnelNetPay":
      return {
        ...state,
        perPersonNetPay: {
          ...state.perPersonNetPay,
          [action.personnelId]: action.value,
        },
      };
  }
}

export function PersonnelPickerDialog({
  open,
  onOpenChange,
  existingPersonnelIds,
  onConfirm,
  title = "从人员库添加",
  description = "先从右侧挑人加入本次添加清单，再统一加入当前工资表。",
}: Props) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(false);
  // 将一次用户操作涉及的字段合并为原子转换，避免会话重置不完整。
  const [draft, dispatchDraft] = useReducer(
    pickerDraftReducer,
    undefined,
    createPickerDraftState
  );
  const {
    pendingIds,
    pendingSelectionIds,
    search,
    unifiedNetPay,
    perPersonNetPay,
  } = draft;
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const personnelRequestId = useRef(0);
  const submissionRequestId = useRef(0);
  const searchInputId = useId();

  useEffect(() => {
    if (!open) {
      personnelRequestId.current++;
      submissionRequestId.current++;
      setLoading(false);
      setSubmitting(false);
      return;
    }

    let active = true;
    const requestId = ++personnelRequestId.current;
    // 每次打开先清空缓存，避免加载失败时旧人员再次变得可操作。
    setPersonnel([]);
    setLoadError(null);
    setLoading(true);
    void personnelApi.list()
      .then((data) => {
        if (active && requestId === personnelRequestId.current) {
          setPersonnel(data);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (active && requestId === personnelRequestId.current) {
          setPersonnel([]);
          setLoadError("人员列表加载失败，请稍后重试");
        }
      })
      .finally(() => {
        if (active && requestId === personnelRequestId.current) {
          setLoading(false);
        }
      });
    dispatchDraft({ type: "reset" });

    return () => {
      // 关闭或卸载后使人员列表响应失效，防止旧结果污染下一次打开。
      active = false;
    };
  }, [open]);

  const personnelById = useMemo(
    () => new Map(personnel.map((item) => [item.id, item])),
    [personnel]
  );

  const availablePersonnel = useMemo(() => {
    const existingSet = new Set(existingPersonnelIds);
    const pendingSet = new Set(pendingIds);
    return personnel.filter(
      (p) =>
        !existingSet.has(p.id) &&
        !pendingSet.has(p.id) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.idCardNumber?.includes(search) ||
          p.phoneNumber?.includes(search) ||
          p.payrollCardNumber?.includes(search))
    );
  }, [personnel, existingPersonnelIds, pendingIds, search]);

  const pendingPersonnel = useMemo(() => {
    return pendingIds
      .map((id) => personnelById.get(id))
      .filter((p): p is Personnel => p != null);
  }, [pendingIds, personnelById]);

  const addToPending = (personnelId: number) => {
    dispatchDraft({ type: "addPersonnel", personnelId });
  };

  const removeFromPending = (personnelId: number) => {
    dispatchDraft({ type: "removePersonnel", personnelId });
  };

  const removeSelectedPending = () => {
    dispatchDraft({ type: "removeSelected" });
  };

  const togglePendingSelection = (personnelId: number) => {
    dispatchDraft({ type: "toggleSelection", personnelId });
  };

  const toggleSelectAllPending = () => {
    if (pendingSelectionIds.size === pendingPersonnel.length) {
      dispatchDraft({ type: "setSelection", personnelIds: [] });
    } else {
      dispatchDraft({
        type: "setSelection",
        personnelIds: pendingPersonnel.map((person) => person.id),
      });
    }
  };

  const handleUnifiedNetPayChange = (value: string) => {
    dispatchDraft({ type: "setUnifiedNetPay", value });
  };

  const handlePerPersonNetPayChange = (personnelId: number, value: string) => {
    dispatchDraft({ type: "setPersonnelNetPay", personnelId, value });
  };

  const handleSubmit = async () => {
    if (pendingIds.length === 0) return;
    const requestId = ++submissionRequestId.current;
    setSubmitting(true);
    try {
      const perPersonNetPayNum: Record<number, number> = {};
      let hasPerPerson = false;
      Object.entries(perPersonNetPay).forEach(([id, value]) => {
        if (value !== "" && !isNaN(Number(value))) {
          perPersonNetPayNum[Number(id)] = Number(value);
          hasPerPerson = true;
        }
      });

      const defaultNetPay =
        unifiedNetPay !== "" && !isNaN(Number(unifiedNetPay))
          ? Number(unifiedNetPay)
          : undefined;

      await onConfirm({
        personnelIds: pendingIds,
        defaultNetPay,
        perPersonNetPay: hasPerPerson ? perPersonNetPayNum : undefined,
      });
      if (requestId === submissionRequestId.current) {
        onOpenChange(false);
      }
    } catch (error: any) {
      if (requestId === submissionRequestId.current) {
        console.error("添加失败", error);
      }
    } finally {
      setSubmitting((current) =>
        requestId === submissionRequestId.current ? false : current
      );
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // 提交期间统一阻止关闭，避免旧请求完成后影响后来重新打开的弹窗。
    if (!nextOpen && submitting) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="!max-w-5xl !w-[90vw] !p-0 gap-0 overflow-hidden"
        style={{ maxHeight: "90vh" }}
        showCloseButton={!submitting}
      >
        <div className="flex flex-col h-[90vh]">
          <DialogHeader className="px-6 py-5 border-b shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 p-6 flex-1 min-h-0 overflow-hidden">
            <section className="flex min-h-0 flex-col gap-4 rounded-xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground">
                    本次添加的人员
                  </h3>
                  <p className="text-xs leading-5 text-muted-foreground">
                    已选 {pendingPersonnel.length} 人，可统一设置同一实发工资。
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingSelectionIds.size === 0 || submitting}
                  onClick={removeSelectedPending}
                >
                  <Trash2 className="size-4" />
                  批量移除
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/20 p-3 shrink-0">
                <label className="grid gap-2 text-sm grid-cols-[5.75rem_minmax(0,1fr)] items-center">
                  <span className="font-medium text-foreground">
                    统一实发工资
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    min="0"
                    value={unifiedNetPay}
                    onChange={(e) => handleUnifiedNetPayChange(e.target.value)}
                    placeholder="可留空"
                    disabled={submitting || pendingIds.length === 0}
                  />
                </label>
                <p className="text-xs leading-5 text-muted-foreground">
                  留空时只加入人员；填写后会为本次加入的人员统一写入该工资。
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30 p-3">
                <div className="h-full flex flex-col gap-2 overflow-y-auto pr-2">
                  {pendingPersonnel.length > 0 ? (
                    <>
                      <div className="flex items-center gap-3 px-3 py-1 text-xs text-muted-foreground shrink-0">
                        <Checkbox
                          checked={
                            pendingPersonnel.length > 0 &&
                            pendingSelectionIds.size === pendingPersonnel.length
                          }
                          onCheckedChange={toggleSelectAllPending}
                          aria-label="全选"
                        />
                        <span className="flex-1 font-medium">全选</span>
                        <span className="w-20 text-right">实发工资</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {pendingPersonnel.map((person) => {
                          const selected = pendingSelectionIds.has(person.id);
                          return (
                            <div
                              key={person.id}
                              className={cn(
                                "flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-3 transition hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm",
                                submitting && "opacity-60"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selected}
                                  disabled={submitting}
                                  onCheckedChange={() =>
                                    togglePendingSelection(person.id)
                                  }
                                  aria-label={`选择 ${person.name}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {person.name}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={submitting}
                                  onClick={() => removeFromPending(person.id)}
                                  aria-label={`移除 ${person.name}`}
                                  className="size-8"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 pl-7">
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  实发工资
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="1"
                                  min="0"
                                  value={perPersonNetPay[person.id] ?? ""}
                                  onChange={(e) =>
                                    handlePerPersonNetPayChange(
                                      person.id,
                                      e.target.value
                                    )
                                  }
                                  disabled={submitting}
                                  placeholder="可留空"
                                  aria-label={`${person.name}的实发工资`}
                                  className="h-7 w-full text-xs"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="m-auto rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                      右侧选择人员后，会先进入这里等待统一提交。
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col gap-4 rounded-xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-3 shrink-0">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-foreground">
                    待添加的人员
                  </h3>
                  <p className="text-xs leading-5 text-muted-foreground">
                    自动排除已在当前工资表和已加入左侧清单的人员。
                  </p>
                </div>
              </div>

              <div className="relative shrink-0">
                <label htmlFor={searchInputId} className="sr-only">
                  搜索待添加人员
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={searchInputId}
                  type="search"
                  value={search}
                  onChange={(e) =>
                    dispatchDraft({ type: "setSearch", value: e.target.value })
                  }
                  placeholder="搜索姓名、手机号、身份证号、工资卡号"
                  disabled={submitting}
                  className="pl-9"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30 p-3">
                <div className="h-full flex flex-col gap-2 overflow-y-auto pr-2">
                  {loading ? (
                    <div className="m-auto text-center py-8 text-sm text-muted-foreground">
                      加载中...
                    </div>
                  ) : loadError ? (
                    <div
                      role="alert"
                      className="m-auto rounded-md border border-destructive/40 px-4 py-10 text-center text-sm text-destructive"
                    >
                      {loadError}
                    </div>
                  ) : availablePersonnel.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {availablePersonnel.map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 transition hover:border-primary/30 hover:bg-accent/20 hover:shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {person.name}
                            </p>
                            {person.idCardNumber && (
                              <p className="truncate text-xs text-muted-foreground font-mono">
                                {person.idCardNumber}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={submitting}
                            onClick={() => addToPending(person.id)}
                            aria-label={`添加 ${person.name}`}
                          >
                            <Plus className="size-4" />
                            添加
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="m-auto rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                      没有可添加的人员了，可以调整搜索条件。
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          <DialogFooter className="shrink-0 !-mx-0 !-mb-0 !rounded-none px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
            <Button
              type="button"
              disabled={pendingIds.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "添加中..." : "加入当前工资表"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
