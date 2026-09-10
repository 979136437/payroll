"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Person } from "../model/personnel";

export function PersonnelTable({ people, selected, onSelection, onEdit, onDelete, searching }: {
  people: Person[];
  selected: string[];
  onSelection: (ids: string[]) => void;
  onEdit: (person: Person) => void;
  onDelete: (ids: string[]) => void;
  searching: boolean;
}) {
  const allSelected = people.length > 0 && people.every((person) => selected.includes(person.id));
  const someSelected = people.some((person) => selected.includes(person.id));
  function togglePage() {
    onSelection(allSelected
      ? selected.filter((id) => !people.some((person) => person.id === id))
      : [...new Set([...selected, ...people.map((person) => person.id)])]);
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-10 pl-3">
              <Checkbox aria-label="全选当前页" checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={togglePage} />
            </TableHead>
            {["姓名", "性别", "民族", "联系电话", "身份证号码", "工资卡号", "操作"].map((label) => <TableHead key={label}>{label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow key={person.id} data-state={selected.includes(person.id) ? "selected" : undefined}>
              <TableCell className="pl-3">
                <Checkbox aria-label={`选择 ${person.name}`} checked={selected.includes(person.id)}
                  onCheckedChange={(checked) => onSelection(checked ? [...selected, person.id] : selected.filter((id) => id !== person.id))} />
              </TableCell>
              <TableCell className="font-medium">{person.name}</TableCell>
              {[person.gender, person.ethnicity, person.phone, person.idCardNumber, person.salaryCardNumber].map((value, index) => (
                <TableCell key={index}>{value || "—"}</TableCell>
              ))}
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label={`编辑 ${person.name}`} onClick={() => onEdit(person)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label={`删除 ${person.name}`} onClick={() => onDelete([person.id])}><Trash2 /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!people.length && <TableRow><TableCell colSpan={8} className="h-44 text-center text-muted-foreground">{searching ? "没有匹配的人员" : "暂无人员数据"}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
