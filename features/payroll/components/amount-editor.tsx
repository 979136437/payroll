"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useDemo } from "@/features/demo/hooks/use-demo";
import { formatAmount, parseAmount } from "../model/payroll";

export function AmountEditor({ payrollId, personId, name, amount }: {
  payrollId: string; personId: string; name: string; amount: number | null;
}) {
  const { send } = useDemo();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  function save() {
    try {
      const issue = send({ type: "amount", id: payrollId, personId, amount: parseAmount(value) });
      if (issue) return setError(issue);
      setEditing(false);
      toast.success("实发工资已保存");
    } catch (cause) { setError((cause as Error).message); }
  }

  if (!editing) {
    return (
      <Button variant="ghost" className="w-full justify-end tabular-nums" aria-label={`编辑${name}的实发工资`}
        onClick={() => { setValue(amount === null ? "" : formatAmount(amount).replaceAll(",", "")); setError(null); setEditing(true); }}>
        {amount === null ? <span className="text-muted-foreground">未填写</span> : formatAmount(amount)}
        <Pencil className="size-3 text-muted-foreground" />
      </Button>
    );
  }
  return (
    <div>
      <div className="flex min-w-48 items-center gap-1">
        <Input className="w-32" autoFocus aria-label={`${name}的实发工资`} inputMode="decimal" maxLength={20}
          value={value} aria-invalid={!!error} aria-describedby={error ? `amount-error-${personId}` : undefined}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") setEditing(false); }} />
        <Button variant="ghost" size="icon" aria-label="保存实发工资" onClick={save}><Check /></Button>
        <Button variant="ghost" size="icon" aria-label="取消编辑实发工资" onClick={() => setEditing(false)}><X /></Button>
      </div>
      {error && <FieldError id={`amount-error-${personId}`} className="mt-2 max-w-60 whitespace-normal">{error}</FieldError>}
    </div>
  );
}
