"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPersonnel = async () => {
    setLoading(true);
    try {
      const data = await personnelApi.list();
      setPersonnel(data);
    } catch (error: any) {
      toast.error(error.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnel();
  }, []);

  const handleCreate = async (data: CreatePersonnelInput) => {
    await personnelApi.create(data);
    toast.success("创建成功");
    loadPersonnel();
  };

  const handleUpdate = async (data: CreatePersonnelInput) => {
    if (!editingPersonnel) return;
    await personnelApi.update(editingPersonnel.id, data);
    toast.success("更新成功");
    loadPersonnel();
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
      loadPersonnel();
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

  const toggleSelectAll = () => {
    if (selectedIds.size === personnel.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(personnel.map((p) => p.id)));
    }
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
      loadPersonnel();
    } catch (error: any) {
      toast.error(error.message || "导入失败");
    } finally {
      e.target.value = "";
    }
  };

  const handleExport = () => {
    window.open(personnelApi.exportExcel(), "_blank");
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = async (targetIndex: number) => {
    if (draggedIndex == null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      dragOverIndex.current = null;
      return;
    }

    const newList = [...personnel];
    const [removed] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, removed);

    setPersonnel(newList);
    setDraggedIndex(null);
    dragOverIndex.current = null;

    try {
      await personnelApi.reorder(newList.map((p) => p.id));
      toast.success("排序已保存");
    } catch (error: any) {
      toast.error(error.message || "排序失败");
      loadPersonnel();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>人员管理</CardTitle>
              <CardDescription>
                共 {personnel.length} 名人员
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
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
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        personnel.length > 0 &&
                        selectedIds.size === personnel.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="全选"
                    />
                  </TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>工种</TableHead>
                  <TableHead>身份证号码</TableHead>
                  <TableHead>工资卡号</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : personnel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无人员数据
                    </TableCell>
                  </TableRow>
                ) : (
                  personnel.map((p, index) => (
                    <TableRow
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      className={
                        draggedIndex === index ? "opacity-50" : ""
                      }
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
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.gender || "-"}</TableCell>
                      <TableCell>{p.jobType || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.idCardNumber || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.payrollCardNumber || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.phoneNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(p)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
