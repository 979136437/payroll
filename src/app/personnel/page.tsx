"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PersonnelFormDialog } from "@/components/personnel/personnel-form-dialog";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { personnelApi } from "@/lib/api";
import type { Personnel, CreatePersonnelInput } from "@/lib/types";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Upload,
  Download,
  GripVertical,
  Search,
} from "lucide-react";

const DEFAULT_PAGE_SIZE = 10;

function openPersonnelExport() {
  window.open(personnelApi.exportExcel(), "_blank", "noopener,noreferrer");
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "batch";
    id?: number;
  } | null>(null);
  const [draggedPersonnelId, setDraggedPersonnelId] = useState<number | null>(
    null
  );
  const dragOverPersonnelId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const personnelRequestId = useRef(0);
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const loadPersonnel = async () => {
    const requestId = ++personnelRequestId.current;
    setLoading(true);
    try {
      const data = await personnelApi.list();
      if (requestId === personnelRequestId.current) {
        setPersonnel(data);
        setSelectedIds((currentIds) => {
          const existingIds = new Set(data.map((item) => item.id));
          // 列表对账时移除已删除人员，避免批量操作继续携带陈旧标识。
          return new Set(
            Array.from(currentIds).filter((id) => existingIds.has(id))
          );
        });
      }
    } catch (error: any) {
      if (requestId === personnelRequestId.current) {
        toast.error(error.message || "加载失败");
      }
    } finally {
      setLoading((currentLoading) =>
        requestId === personnelRequestId.current ? false : currentLoading
      );
    }
  };

  useEffect(() => {
    void loadPersonnel();
  }, []);

  const handleCreate = async (data: CreatePersonnelInput) => {
    await personnelApi.create(data);
    toast.success("创建成功");
    void loadPersonnel();
  };

  const handleUpdate = async (data: CreatePersonnelInput) => {
    if (!editingPersonnel) return;
    await personnelApi.update(editingPersonnel.id, data);
    toast.success("更新成功");
    void loadPersonnel();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "single" && deleteTarget.id != null) {
        await personnelApi.delete(deleteTarget.id);
        toast.success("删除成功");
      } else if (deleteTarget.type === "batch") {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        await personnelApi.batchDelete(ids);
        toast.success(`已删除 ${ids.length} 条记录`);
        setSelectedIds(new Set());
      }
      void loadPersonnel();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleEdit = (p: Personnel) => {
    setEditingPersonnel(p);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingPersonnel(null);
    setFormOpen(true);
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await personnelApi.importExcel(file);
      toast.success(
        `导入完成：新增 ${result.createdCount} 条，更新 ${result.updatedCount} 条，跳过 ${result.skippedCount} 条`
      );
      if (result.errors.length > 0) {
        toast.error(`有 ${result.errors.length} 条错误`);
      }
      void loadPersonnel();
    } catch (error: any) {
      toast.error(error.message || "导入失败");
    } finally {
      e.target.value = "";
    }
  };

  const filteredPersonnel = useMemo(() => {
    if (!search.trim()) return personnel;
    const q = search.toLowerCase();
    return personnel.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.idCardNumber?.toLowerCase().includes(q) ||
        p.payrollCardNumber?.toLowerCase().includes(q) ||
        p.phoneNumber?.includes(q)
    );
  }, [personnel, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPersonnel.length / pageSize)
  );
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedPersonnel = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filteredPersonnel.slice(start, start + pageSize);
  }, [filteredPersonnel, pageSize, safePageIndex]);

  const handlePageIndexChange = (index: number) => {
    setPageIndex(Math.max(0, index));
  };

  const handlePageSizeChange = (size: number) => {
    setPageIndex(0);
    setPageSize(size);
  };

  const handleDragStart = (personnelId: number) => {
    setDraggedPersonnelId(personnelId);
  };

  const handleDragOver = (e: React.DragEvent, personnelId: number) => {
    e.preventDefault();
    dragOverPersonnelId.current = personnelId;
  };

  const handleDrop = async (targetPersonnelId: number) => {
    if (
      draggedPersonnelId == null ||
      draggedPersonnelId === targetPersonnelId
    ) {
      setDraggedPersonnelId(null);
      dragOverPersonnelId.current = null;
      return;
    }

    const draggedIndex = personnel.findIndex(
      (item) => item.id === draggedPersonnelId
    );
    const targetIndex = personnel.findIndex(
      (item) => item.id === targetPersonnelId
    );
    if (draggedIndex < 0 || targetIndex < 0) {
      setDraggedPersonnelId(null);
      dragOverPersonnelId.current = null;
      return;
    }

    const newList = [...personnel];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, removed);

    setPersonnel(newList);
    setDraggedPersonnelId(null);
    dragOverPersonnelId.current = null;

    try {
      await personnelApi.reorder(newList.map((p) => p.id));
      toast.success("排序已保存");
    } catch (error: any) {
      toast.error(error.message || "排序失败");
      void loadPersonnel();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>人员管理</CardTitle>
              <CardDescription>
                共 {personnel.length} 名人员
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <label htmlFor="personnel-search" className="sr-only">
                  搜索人员
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="personnel-search"
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder="搜索姓名、身份证号、工资卡号、电话"
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openPersonnelExport}>
                  <Download className="size-4 mr-2" />
                  导出
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  导入
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImport}
                />
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteTarget({ type: "batch" });
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="size-4 mr-2" />
                    删除选中 ({selectedIds.size})
                  </Button>
                )}
                <Button onClick={handleAdd}>
                  <Plus className="size-4 mr-2" />
                  新增人员
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>
                    <Checkbox
                      checked={
                        pagedPersonnel.length > 0 &&
                        pagedPersonnel.every((p) => selectedIds.has(p.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const newSelected = new Set(selectedIds);
                          pagedPersonnel.forEach((p) =>
                            newSelected.add(p.id)
                          );
                          setSelectedIds(newSelected);
                        } else {
                          const newSelected = new Set(selectedIds);
                          pagedPersonnel.forEach((p) =>
                            newSelected.delete(p.id)
                          );
                          setSelectedIds(newSelected);
                        }
                      }}
                      aria-label="全选当前页"
                    />
                  </TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>民族</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>身份证号码</TableHead>
                  <TableHead>工资卡号</TableHead>
                  <TableHead className="sticky right-0 bg-muted z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredPersonnel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {search ? "没有匹配的人员" : "暂无人员数据"}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedPersonnel.map((p) => (
                    <TableRow
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(p.id)}
                      onDragOver={(e) => handleDragOver(e, p.id)}
                      onDrop={() => handleDrop(p.id)}
                      className={`group ${draggedPersonnelId === p.id
                          ? "opacity-50"
                          : ""
                        }`}
                    >
                      <TableCell>
                        <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleSelect(p.id)}
                          aria-label="选择"
                        />
                      </TableCell>
                      <TableCell className="font-medium truncate" title={p.name}>{p.name}</TableCell>
                      <TableCell>{p.gender || "-"}</TableCell>
                      <TableCell className="truncate" title={p.ethnicity || ""}>{p.ethnicity || "-"}</TableCell>
                      <TableCell className="font-mono text-sm truncate" title={p.phoneNumber || ""}>
                        {p.phoneNumber || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm truncate" title={p.idCardNumber || ""}>
                        {p.idCardNumber || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm truncate" title={p.payrollCardNumber || ""}>
                        {p.payrollCardNumber || "-"}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background group-hover:bg-muted/50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`编辑 ${p.name}`}
                            onClick={() => handleEdit(p)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`删除 ${p.name}`}
                            onClick={() => {
                              setDeleteTarget({ type: "single", id: p.id });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredPersonnel.length > 0 && (
              <TablePaginationFooter
                onPageIndexChange={handlePageIndexChange}
                onPageSizeChange={handlePageSizeChange}
                pageIndex={safePageIndex}
                pageSize={pageSize}
                totalCount={filteredPersonnel.length}
                totalPages={totalPages}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <PersonnelFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        personnel={editingPersonnel}
        onSubmit={editingPersonnel ? handleUpdate : handleCreate}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "single"
                ? "确定要删除该人员吗？此操作不可撤销。"
                : `确定要删除选中的 ${selectedIds.size} 名人员吗？此操作不可撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
