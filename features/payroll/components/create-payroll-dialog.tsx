"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useDemo } from "@/features/demo/hooks/use-demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { ChoiceSelect } from "@/components/choice-select";

export function CreatePayrollDialog({ onClose }: { onClose: () => void }) {
  const { state, send } = useDemo();
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState("none");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const issue = send({ type: "create", id: crypto.randomUUID(), name, sourceId });
    if (issue) return setError(issue);
    toast.success("工资表创建成功");
    onClose();
  }

  return (
    <FormDialog title="新建工资表" description="创建空表，或复制已有工资表的人员和金额。" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="mb-6 grid gap-4">
          <Field>
            <FieldLabel htmlFor="payroll-name">工资表名称 <span className="text-destructive">*</span></FieldLabel>
            <Input id="payroll-name" autoFocus placeholder="例如：2026年9月" maxLength={80} value={name} aria-required
              aria-invalid={!!error} aria-describedby={error ? "payroll-error" : undefined} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="payroll-source">复制来源（可选）</FieldLabel>
            <ChoiceSelect id="payroll-source" className="w-full" label="复制来源" value={sourceId} onChange={setSourceId}
              options={[{ value: "none", label: "不复制，创建空表" }, ...state.payrolls.map((item) => ({ value: item.id, label: item.name }))]} />
          </Field>
          {error && <FieldError id="payroll-error">{error}</FieldError>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>取消</Button><Button type="submit">创建</Button></DialogFooter>
      </form>
    </FormDialog>
  );
}
