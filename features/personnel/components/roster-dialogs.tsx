"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { ApiError, checkResponse } from "../hooks/use-personnel";

async function download(params: URLSearchParams) {
  const response = await checkResponse(await fetch(`/api/personnel/export?${params}`, { cache: "no-store" }));
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  const name = response.headers.get("content-disposition")?.split("filename*=UTF-8''")[1];
  link.download = name ? decodeURIComponent(name) : "花名册.xlsx";
  link.click();
  // 给浏览器时间开始读取 Blob，再释放临时 URL。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportRosterDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  async function run(template: boolean) {
    if (pending) return;
    setError(null); setPending(true);
    try {
      if (template) { await download(new URLSearchParams({ template: "1" })); return; }
      if (!file || !file.name.toLowerCase().endsWith(".xlsx")) throw new ApiError("请选择xlsx花名册文件");
      if (file.size > 5 * 1024 * 1024) throw new ApiError("文件不能超过5 MB");
      const response = await checkResponse(await fetch("/api/personnel/import", { method: "POST", body: file, headers: { "Content-Type": "application/octet-stream" } }));
      const result = await response.json();
      await client.invalidateQueries({ queryKey: ["personnel"] });
      toast.success(`已导入${result.count}名人员`); onClose();
    } catch (cause) { setError(cause instanceof ApiError ? cause : new ApiError("操作失败，请稍后重试")); }
    finally { setPending(false); }
  }
  return <FormDialog title="导入花名册" description="使用花名册工作表，第3行为表头。任何错误或重名都会取消整批导入。" onClose={() => { if (!pending) onClose(); }} className="sm:max-w-xl">
    <p className="text-sm text-muted-foreground">最多5 MB、5000行。只保存人员基本资料；序号不作为编号，工种、上场时间、撤场时间和备注不会保存。</p>
    <Input aria-label="花名册文件" type="file" accept=".xlsx" disabled={pending} onChange={event => { setFile(event.target.files?.[0] ?? null); setError(null); }} />
    {error && <div role="alert" className="max-h-60 overflow-auto text-sm text-destructive"><p>{error.message}</p>{error.issues?.map((issue, index) => <p key={index}>第{issue.row}行 · {issue.field}：{issue.message}</p>)}</div>}
    <DialogFooter><Button variant="outline" disabled={pending} onClick={() => void run(true)}>下载模板</Button><Button variant="outline" disabled={pending} onClick={onClose}>取消</Button><Button disabled={pending || !file} onClick={() => void run(false)}>{pending ? "处理中…" : "导入"}</Button></DialogFooter>
  </FormDialog>;
}

export function ExportRosterDialog({ query, onClose }: { query: string; onClose: () => void }) {
  const [unit, setUnit] = useState("");
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0,7));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <FormDialog title="导出花名册" description="导出当前搜索结果的全部人员，不限当前页。工种统一为砌砖，上场时间、撤场时间和备注留空。" onClose={() => { if (!pending) onClose(); }}>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); if (pending) return;
      setPending(true); setError("");
      try { await download(new URLSearchParams({ query, unit, month })); onClose(); }
      catch (cause) { setError(cause instanceof ApiError ? cause.message : "导出失败，请检查网络连接后重试"); }
      finally { setPending(false); }
    }}>
      <Field><FieldLabel htmlFor="roster-unit">编制单位（可留空）</FieldLabel><Input id="roster-unit" value={unit} maxLength={100} onChange={event => setUnit(event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="roster-month">月份</FieldLabel><Input id="roster-month" type="month" required value={month} onChange={event => setMonth(event.target.value)} /></Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={onClose}>取消</Button><Button type="submit" disabled={pending}>{pending ? "导出中…" : "导出"}</Button></DialogFooter>
    </form>
  </FormDialog>;
}
