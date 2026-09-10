"use client";

import { useState } from "react";
import { Download, Upload, Plus, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ChoiceSelect } from "@/components/choice-select";
import { useDemo } from "@/features/demo/hooks/use-demo";
import { paginate, searchPeople, type Person } from "../model/personnel";
import { PersonForm } from "./person-form";
import { PersonnelTable } from "./personnel-table";

export function PersonnelPage() {
  const { state, send } = useDemo();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [deleting, setDeleting] = useState<string[]>([]);
  const filtered = searchPeople(state.people, query);
  const result = paginate(filtered, page, pageSize);

  return (
    <section className="min-w-0 rounded-xl border bg-card p-4 text-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-base font-medium">人员管理</h1><p className="text-muted-foreground">共 {state.people.length} 名人员</p></div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" aria-label="搜索人员" placeholder="搜索姓名、身份证号、工资卡号、电话" value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); setSelected([]); }} />
          </div>
          <Button variant="outline" onClick={() => toast.info("演示版暂不支持文件导入／导出")}><Download />导出</Button>
          <Button variant="outline" onClick={() => toast.info("演示版暂不支持文件导入／导出")}><Upload />导入</Button>
          <Button onClick={() => setEditing("new")}><Plus />新增人员</Button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-muted p-2">
          <span>已选择 {selected.length} 名人员</span>
          <Button variant="destructive" onClick={() => setDeleting(selected)}><Trash2 />删除选中 ({selected.length})</Button>
        </div>
      )}
      <PersonnelTable people={result.items} selected={selected} onSelection={setSelected} onEdit={setEditing} onDelete={setDeleting} searching={!!query} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">共 {filtered.length} 条记录</span>
        <div className="flex flex-wrap items-center gap-3">
          <span>每页</span>
          <ChoiceSelect label="每页条数" value={String(pageSize)} options={[5, 10, 20].map((size) => ({ value: String(size), label: `${size} 条` }))}
            onChange={(value) => { setPageSize(Number(value)); setPage(1); setSelected([]); }} />
          <span>第 {result.page} 页，共 {result.pages} 页</span>
          <Pagination aria-label="人员分页" className="w-auto">
            <PaginationContent>
              <PaginationItem><Button variant="outline" size="icon" aria-label="上一页" disabled={result.page === 1} onClick={() => setPage(result.page - 1)}><ChevronLeft /></Button></PaginationItem>
              <PaginationItem><Button variant="outline" size="icon" aria-label="下一页" disabled={result.page === result.pages} onClick={() => setPage(result.page + 1)}><ChevronRight /></Button></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      {editing && <PersonForm person={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting.length > 0 && (
        <ConfirmDialog title="确认删除人员" description={`确定删除选中的 ${deleting.length} 名人员吗？关联工资记录也会同步移除。演示数据将在刷新页面后恢复。`}
          onClose={() => setDeleting([])} onConfirm={() => {
            send({ type: "deletePeople", ids: deleting });
            setSelected([]);
            toast.success("人员已删除");
          }} />
      )}
    </section>
  );
}
