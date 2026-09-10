"use client";

import { useState } from "react";
import { FileText, RefreshCw, Plus, Trash2, Download, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/features/demo/hooks/use-demo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ChoiceSelect } from "@/components/choice-select";
import { formatAmount, totalAmount } from "../model/payroll";
import { CreatePayrollDialog } from "./create-payroll-dialog";
import { AddPeopleDialog } from "./add-people-dialog";
import { PayrollTable } from "./payroll-table";

export function PayrollPage() {
  const { state, send } = useDemo();
  const [dialog, setDialog] = useState<"create" | "add" | "delete" | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const payroll = state.payrolls.find((item) => item.id === state.activeId);
  const selectedIds = selected.filter((id) => payroll?.records.some((record) => record.personId === id));

  return (
    <section className="min-w-0 rounded-xl border bg-card p-4 text-sm">
      <p className="mb-4 text-xs text-muted-foreground">工资页为演示模式，人员与工资数据均为虚构，刷新后恢复；与人员管理中的真实资料独立。</p>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FileText className="size-6 shrink-0" />
          <div><h1 className="text-base font-medium">工资工作台</h1><p className="text-muted-foreground">管理工资表和工员工资</p></div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ChoiceSelect label="请选择工资表" value={state.activeId} disabled={!state.payrolls.length} className="w-full sm:w-72"
            options={state.payrolls.map((item) => ({ value: item.id, label: `${item.name} (${item.records.length} 人)` }))}
            onChange={(id) => { send({ type: "select", id }); setSelected([]); }} />
          <Button size="icon" variant="outline" aria-label="刷新工资表" disabled={!payroll} onClick={() => toast.success("已刷新当前演示工资表")}><RefreshCw /></Button>
          <Button variant="outline" onClick={() => setDialog("create")}><Plus />新建工资表</Button>
          {payroll && <Button size="icon" variant="outline" className="text-destructive" aria-label="删除工资表" onClick={() => setDialog("delete")}><Trash2 /></Button>}
        </div>
      </div>
      {!payroll ? (
        <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
          <FileText className="size-16 text-muted-foreground" />
          <h2 className="text-lg font-medium">暂无工资表</h2>
          <p className="text-muted-foreground">创建一个新的工资表开始管理工资</p>
          <Button onClick={() => setDialog("create")}><Plus />新建工资表</Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p>共 <strong>{payroll.records.length}</strong> 条记录，实发合计：<strong className="text-base tabular-nums">¥ {formatAmount(totalAmount(payroll.records))}</strong></p>
            <div className="flex flex-wrap gap-2">
              {selectedIds.length > 0 && (
                <Button variant="destructive" onClick={() => { send({ type: "removeRecords", id: payroll.id, ids: selectedIds }); setSelected([]); toast.success("选中记录已移除"); }}>
                  移除选中 ({selectedIds.length})
                </Button>
              )}
              <Button onClick={() => setDialog("add")}><UserPlus />添加人员</Button>
              <Button variant="outline" onClick={() => toast.info("演示版暂不支持文件导入／导出")}><Download />导出 Excel</Button>
            </div>
          </div>
          <PayrollTable payroll={payroll} selected={selectedIds} onSelection={setSelected} />
        </>
      )}
      {dialog === "create" && <CreatePayrollDialog onClose={() => { setDialog(null); setSelected([]); }} />}
      {dialog === "add" && payroll && <AddPeopleDialog payroll={payroll} onClose={() => setDialog(null)} />}
      {dialog === "delete" && payroll && (
        <ConfirmDialog title="确认删除工资表" description={`确定删除工资表「${payroll.name}」吗？表内所有工资记录也会移除，人员库不受影响。`}
          onClose={() => setDialog(null)} onConfirm={() => {
            send({ type: "deletePayroll", id: payroll.id });
            setSelected([]);
            toast.success("工资表已删除");
          }} />
      )}
    </section>
  );
}
