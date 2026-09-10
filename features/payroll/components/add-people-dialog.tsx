"use client";

import { useState, type FormEvent } from "react";
import { Plus, X, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/features/demo/hooks/use-demo";
import { searchPeople } from "@/features/personnel/model/personnel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { parseAmount, type Payroll } from "../model/payroll";

export function AddPeopleDialog({ payroll, onClose }: { payroll: Payroll; onClose: () => void }) {
  const { state, send } = useDemo();
  const [ids, setIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const available = searchPeople(state.people.filter((person) =>
    !payroll.records.some((record) => record.personId === person.id) && !ids.includes(person.id)), query);
  const selected = state.people.filter((person) => ids.includes(person.id));

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const issue = send({ type: "addPeople", id: payroll.id, ids, amount: parseAmount(amount) });
      if (issue) return setError(issue);
      toast.success(`已添加 ${ids.length} 人`);
      onClose();
    } catch (cause) { setError((cause as Error).message); }
  }

  return (
    <FormDialog title="从人员库添加" description="先从右侧挑人加入本次添加清单，再统一加入当前工资表。"
      onClose={onClose} className="sm:max-w-4xl">
      <form onSubmit={submit} noValidate>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <section className="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">本次添加的人员</h2><span className="rounded bg-muted px-2 py-0.5 text-xs">{ids.length} 人</span>
            </div>
            <Field>
              <FieldLabel htmlFor="batch-amount">统一实发工资</FieldLabel>
              <Input id="batch-amount" inputMode="decimal" placeholder="可留空" maxLength={20} value={amount}
                aria-invalid={!!error} aria-describedby="amount-help" onChange={(event) => setAmount(event.target.value)} />
              <FieldDescription id="amount-help" className="text-xs">留空时只加入人员；填写后为本次加入的人员统一设置工资。</FieldDescription>
            </Field>
            <ScrollArea className="h-52">
              {selected.map((person) => (
                <div className="flex items-center justify-between gap-2 border-b py-3 pr-3" key={person.id}>
                  <div><p className="font-medium">{person.name}</p><p className="text-xs text-muted-foreground">{person.phone || "未填写电话"}</p></div>
                  <Button size="icon" variant="ghost" aria-label={`移除 ${person.name}`} onClick={() => setIds(ids.filter((id) => id !== person.id))}><X /></Button>
                </div>
              ))}
              {!selected.length && <div className="flex h-44 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground"><Users className="size-8" /><p>右侧选择人员后，会先进入这里等待统一提交。</p></div>}
            </ScrollArea>
            {ids.length > 0 && <Button variant="outline" className="self-start" onClick={() => setIds([])}>清空选择</Button>}
          </section>
          <section className="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">待添加的人员</h2><span className="rounded bg-muted px-2 py-0.5 text-xs">{available.length} 人</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" aria-label="搜索待添加人员" placeholder="搜索姓名、电话、证件号、工资卡号" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">自动排除已在当前工资表和左侧清单中的人员。</p>
            <ScrollArea className="h-64">
              {available.map((person) => (
                <div className="flex items-center justify-between gap-2 border-b py-3 pr-3" key={person.id}>
                  <div><p className="font-medium">{person.name}</p><p className="text-xs text-muted-foreground">{person.phone || "未填写电话"}</p></div>
                  <Button variant="outline" aria-label={`添加 ${person.name}`} onClick={() => setIds([...ids, person.id])}><Plus />添加</Button>
                </div>
              ))}
              {!available.length && <p className="py-16 text-center text-muted-foreground">没有可添加的人员了，可以调整搜索条件。</p>}
            </ScrollArea>
          </section>
        </div>
        {error && <FieldError className="mb-4">{error}</FieldError>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button type="submit" disabled={!ids.length}>加入当前工资表 ({ids.length})</Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
