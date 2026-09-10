"use client";

import { useMemo } from "react";
import { rowSelectionFeature, tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toRowSelection, updateSelectedIds } from "@/lib/table-selection";
import type { Person } from "../model/personnel";

interface PersonnelTableProps {
  people: Person[];
  selected: string[];
  onSelection: (ids: string[]) => void;
  onEdit: (person: Person) => void;
  onDelete: (ids: string[]) => void;
  searching: boolean;
}
interface PersonnelRow {
  person: Person;
  onEdit: PersonnelTableProps["onEdit"];
  onDelete: PersonnelTableProps["onDelete"];
}
const features = tableFeatures({ rowSelectionFeature });
// 列组件保持固定身份，回调和人员数据通过行模型取得最新值。
const columns: ColumnDef<typeof features, PersonnelRow>[] = [
  {
    id: "selection",
    header: ({ table }) => <Checkbox aria-label="全选当前页"
      checked={table.getIsAllPageRowsSelected()}
      indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)} />,
    cell: ({ row }) => <Checkbox aria-label={`选择 ${row.original.person.name}`} checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(checked)} />,
  },
  { id: "name", header: "姓名", cell: ({ row }) => <span className="font-medium">{row.original.person.name}</span> },
  ...([
    ["gender", "性别"], ["ethnicity", "民族"], ["phone", "联系电话"],
    ["idCardNumber", "身份证号码"], ["salaryCardNumber", "工资卡号"],
  ] as const).map(([key, header]): ColumnDef<typeof features, PersonnelRow> => ({
    id: key, header, accessorFn: ({ person }) => person[key], cell: (info) => info.getValue<string>() || "—",
  })),
  {
    id: "actions", header: "操作", cell: ({ row: { original: { person, onEdit, onDelete } } }) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" aria-label={`编辑 ${person.name}`} onClick={() => onEdit(person)}><Pencil /></Button>
        <Button size="icon" variant="ghost" className="text-destructive" aria-label={`删除 ${person.name}`} onClick={() => onDelete([person.id])}><Trash2 /></Button>
      </div>
    ),
  },
];

export function PersonnelTable({ people, selected, onSelection, onEdit, onDelete, searching }: PersonnelTableProps) {
  const data = useMemo(() => people.map((person) => ({ person, onEdit, onDelete })), [people, onEdit, onDelete]);
  const rowSelection = useMemo(() => toRowSelection(selected), [selected]);
  const table = useTable({
    features, columns, data, getRowId: ({ person }) => person.id,
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
          {table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
            {row.getAllCells().map((cell) => <TableCell key={cell.id} className={cell.column.id === "selection" ? "pl-3" : undefined}>
              <table.FlexRender cell={cell} />
            </TableCell>)}
          </TableRow>)}
          {!people.length && <TableRow><TableCell colSpan={columns.length} className="h-44 text-center text-muted-foreground">{searching ? "没有匹配的人员" : "暂无人员数据"}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
