"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemo } from "@/features/demo/hooks/use-demo";
import type { Payroll } from "../model/payroll";
import { AmountEditor } from "./amount-editor";

export function PayrollTable({ payroll, selected, onSelection }: {
  payroll: Payroll; selected: string[]; onSelection: (ids: string[]) => void;
}) {
  const { state, send } = useDemo();
  const allSelected = payroll.records.length > 0 && payroll.records.every((record) => selected.includes(record.personId));
  const someSelected = payroll.records.some((record) => selected.includes(record.personId));

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-10 pl-3">
              <Checkbox aria-label="全选工资记录" checked={allSelected} indeterminate={someSelected && !allSelected}
                onCheckedChange={() => onSelection(allSelected ? [] : payroll.records.map((record) => record.personId))} />
            </TableHead>
            {["序号", "姓名", "联系电话", "身份证号", "银行卡号", "账户银行", "实发金额", "操作"].map((label) => <TableHead key={label}>{label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payroll.records.map((record, index) => {
            const person = state.people.find((item) => item.id === record.personId);
            if (!person) return null;
            return (
              <TableRow key={record.personId} data-state={selected.includes(person.id) ? "selected" : undefined}>
                <TableCell className="pl-3">
                  <Checkbox aria-label={`选择 ${person.name}`} checked={selected.includes(person.id)}
                    onCheckedChange={(checked) => onSelection(checked ? [...selected, person.id] : selected.filter((id) => id !== person.id))} />
                </TableCell>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{person.name}</TableCell>
                {[person.phone, person.idCardNumber, person.salaryCardNumber, person.bankName].map((value, fieldIndex) => <TableCell key={fieldIndex}>{value || "—"}</TableCell>)}
                <TableCell>
                  <AmountEditor key={`${payroll.id}-${person.id}`} payrollId={payroll.id} personId={person.id} name={person.name} amount={record.amount} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label={`移除${person.name}`}
                    onClick={() => { send({ type: "removeRecords", id: payroll.id, ids: [person.id] }); onSelection(selected.filter((id) => id !== person.id)); }}>
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {!payroll.records.length && <TableRow><TableCell colSpan={9} className="h-44 text-center text-muted-foreground">暂无记录，请先添加人员</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
