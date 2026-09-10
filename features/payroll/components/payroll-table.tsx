"use client";

import { useMemo } from "react";
import { rowSelectionFeature, tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemo } from "@/features/demo/hooks/use-demo";
import type { Person } from "@/features/personnel/model/personnel";
import { toRowSelection, updateSelectedIds } from "@/lib/table-selection";
import type { Payroll, PayrollRecord } from "../model/payroll";
import { AmountEditor } from "./amount-editor";

interface PayrollRow extends PayrollRecord {
  person: Person | undefined;
  payrollId: string;
}
const features = tableFeatures({ rowSelectionFeature });
// 固定列定义避免选择状态变化时重新挂载金额编辑器；工资表 ID 用于隔离编辑状态。
const columns: ColumnDef<typeof features, PayrollRow>[] = [
  {
    id: "selection",
    header: ({ table }) => <Checkbox aria-label="全选工资记录" checked={table.getIsAllRowsSelected()}
      indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
      onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)} />,
    cell: ({ row }) => <Checkbox aria-label={`选择 ${row.original.person?.name}`} checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(checked)} />,
  },
  { id: "sequence", header: "序号", cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span> },
  { id: "name", header: "姓名", cell: ({ row }) => <span className="font-medium">{row.original.person?.name}</span> },
  ...([
    ["phone", "联系电话"], ["idCardNumber", "身份证号"],
    ["salaryCardNumber", "银行卡号"], ["bankName", "账户银行"],
  ] as const).map(([key, header]): ColumnDef<typeof features, PayrollRow> => ({
    id: key, header, accessorFn: ({ person }) => person?.[key], cell: (info) => info.getValue<string>() || "—",
  })),
  {
    id: "amount", header: "实发金额", cell: ({ row: { original } }) => <AmountEditor
      key={`${original.payrollId}-${original.personId}`} payrollId={original.payrollId}
      personId={original.personId} name={original.person!.name} amount={original.amount} />,
  },
  {
    id: "actions", header: "操作", cell: function RemoveRecordCell({ row }) {
      const { send } = useDemo();
      const { personId, payrollId, person } = row.original;
      return <Button variant="ghost" size="icon" className="text-destructive" aria-label={`移除${person!.name}`}
        onClick={() => { send({ type: "removeRecords", id: payrollId, ids: [personId] }); row.toggleSelected(false); }}>
        <Trash2 />
      </Button>;
    },
  },
];

export function PayrollTable({ payroll, selected, onSelection }: {
  payroll: Payroll; selected: string[]; onSelection: (ids: string[]) => void;
}) {
  const { state } = useDemo();
  const peopleById = useMemo(() => new Map(state.people.map((person) => [person.id, person])), [state.people]);
  // 保留原始记录顺序及全选范围，缺失人员的记录仅跳过展示。
  const data = useMemo(() => payroll.records.map((record) => ({
    ...record, person: peopleById.get(record.personId), payrollId: payroll.id,
  })), [payroll.records, payroll.id, peopleById]);
  const rowSelection = useMemo(() => toRowSelection(selected), [selected]);
  const table = useTable({
    features, columns, data, getRowId: (record) => record.personId,
    state: { rowSelection },
    onRowSelectionChange: (update) => onSelection(updateSelectedIds(update, rowSelection)),
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((group) => <TableRow key={group.id}>
            {group.headers.map((header) => <TableHead key={header.id} className={header.column.id === "selection" ? "w-10 pl-3" : undefined}>
              {header.isPlaceholder ? null : <table.FlexRender header={header} />}
            </TableHead>)}
          </TableRow>)}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => row.original.person ? <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
            {row.getAllCells().map((cell) => <TableCell key={cell.id} className={cell.column.id === "selection" ? "pl-3" : undefined}>
              <table.FlexRender cell={cell} />
            </TableCell>)}
          </TableRow> : null)}
          {!payroll.records.length && <TableRow><TableCell colSpan={columns.length} className="h-44 text-center text-muted-foreground">暂无记录，请先添加人员</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
