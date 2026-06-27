"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { personnelApi } from "@/lib/api";
import type { Personnel } from "@/lib/types";
import { Search } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPersonnelIds?: number[];
  onConfirm: (selectedIds: number[]) => void;
  title?: string;
};

export function PersonnelPickerDialog({
  open,
  onOpenChange,
  existingPersonnelIds = [],
  onConfirm,
  title = "选择人员",
}: Props) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadPersonnel();
      setSelectedIds(new Set());
      setSearch("");
    }
  }, [open]);

  const loadPersonnel = async () => {
    setLoading(true);
    try {
      const data = await personnelApi.list();
      setPersonnel(data);
    } catch (error: any) {
      console.error("加载人员列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPersonnel = personnel.filter(
    (p) =>
      !existingPersonnelIds.includes(p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.idCardNumber?.includes(search) ||
        p.jobType?.toLowerCase().includes(search.toLowerCase()))
  );

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
    if (selectedIds.size === filteredPersonnel.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPersonnel.map((p) => p.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、身份证号、工种..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredPersonnel.length > 0 &&
                      selectedIds.size === filteredPersonnel.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                  />
                </TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>工种</TableHead>
                <TableHead>身份证号码</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    无可用人员
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                        aria-label="选择"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.jobType || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {p.idCardNumber || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="pt-4">
          <div className="flex-1 text-sm text-muted-foreground">
            已选择 {selectedIds.size} 人
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
