"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useDemo } from "@/features/demo/hooks/use-demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { ChoiceSelect } from "@/components/choice-select";
import type { Person } from "../model/personnel";

const fields = [
  ["name", "姓名"], ["gender", "性别"], ["ethnicity", "民族"], ["nativePlace", "籍贯"],
  ["idCardNumber", "身份证号码"], ["salaryCardNumber", "工资卡号"], ["bankName", "开户行"], ["phone", "联系电话"],
] as const;

export function PersonForm({ person, onClose }: { person?: Person; onClose: () => void }) {
  const { send } = useDemo();
  const [draft, setDraft] = useState<Person>(person ?? {
    id: "", name: "", gender: "男", ethnicity: "汉族", nativePlace: "",
    idCardNumber: "", salaryCardNumber: "", bankName: "", phone: "",
  });
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const issue = send({ type: "savePerson", person: { ...draft, id: person?.id ?? crypto.randomUUID() } });
    if (issue) return setError(issue);
    toast.success("人员已保存");
    onClose();
  }

  return (
    <FormDialog title={person ? "编辑人员" : "新增人员"} description="填写人员资料，姓名为必填项。请使用虚构信息体验。"
      onClose={onClose} className="sm:max-w-xl">
      <form onSubmit={submit} noValidate>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <Field key={key}>
              <FieldLabel htmlFor={`person-${key}`}>{label}{key === "name" && <span className="text-destructive">*</span>}</FieldLabel>
              {key === "gender" ? (
                <ChoiceSelect id="person-gender" label="性别" value={draft.gender} className="w-full"
                  options={[{ value: "男", label: "男" }, { value: "女", label: "女" }]}
                  onChange={(gender) => setDraft({ ...draft, gender })} />
              ) : (
                <Input id={`person-${key}`} value={draft[key]} maxLength={100} autoFocus={key === "name"}
                  aria-required={key === "name"} aria-invalid={key === "name" && !!error}
                  aria-describedby={error ? "person-error" : undefined}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
              )}
            </Field>
          ))}
        </div>
        {error && <FieldError id="person-error" className="mb-4">{error}</FieldError>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
