"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import type { PayrollSheetRecordRow } from "@/lib/types";
import { payrollApi } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, Edit3, Check, X } from "lucide-react";

const DEFAULT_PAGE_SIZE = 10;

type Props = {
  records: PayrollSheetRecordRow[];
  sheetId: number;
  selectedRecordIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onRefresh: () => void;
};

export function PayrollRecordTable({
  records,
  sheetId,
  selectedRecordIds,
  onToggleSelect,
  onToggleSelectAll,
  onRefresh,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"netPay" | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const totalNetPay = records.reduce((sum, r) => sum + r.netPay, 0);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);

  const pagedRecords = useMemo(() => {
    const start = safePageIndex * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, pageSize, safePageIndex]);

  const handlePageIndexChange = (index: number) => {
    setPageIndex(Math.max(0, index));
  };

  const handlePageSizeChange = (size: number) => {
    setPageIndex(0);
    setPageSize(size);
  };

  const startEdit = (
    record: PayrollSheetRecordRow,
    field: "netPay"
  ) => {
    setEditingId(record.recordId);
    setEditingField(field);
    setEditValue(String(record.netPay));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (editingId == null || !editingField) return;
    setSaving(true);
    try {
      if (editingField === "netPay") {
        const normalizedValue = editValue.trim();
        const value = Number(normalizedValue);
        if (!normalizedValue || !Number.isFinite(value)) {
          toast.error("请输入有效的金额");
          return;
        }
        await payrollApi.updateNetPay(editingId, value);
      }
      toast.success("保存成功");
      onRefresh();
      cancelEdit();
    } catch (error: any) {
      toast.error(error.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedRecordIds.size === 0 || removing) return;
    const selectedPersonnelIds: number[] = [];
    for (const record of records) {
      if (selectedRecordIds.has(record.recordId)) {
        selectedPersonnelIds.push(record.personnelId);
      }
    }
    if (selectedPersonnelIds.length === 0) return;

    setRemoving(true);
    try {
      await payrollApi.removePersonnel(sheetId, selectedPersonnelIds);
      toast.success(`已移除 ${selectedPersonnelIds.length} 人`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "移除失败");
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveOne = async (personnelId: number) => {
    if (removing) return;

    setRemoving(true);
    try {
      await payrollApi.removePersonnel(sheetId, [personnelId]);
      toast.success("已移除");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "移除失败");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {records.length} 条记录，实发合计：
          <span className="font-semibold text-foreground ml-1">
            ¥{totalNetPay.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {selectedRecordIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveSelected}
            disabled={removing}
          >
            <Trash2 className="size-4 mr-2" />
            移除选中 ({selectedRecordIds.size})
          </Button>
        )}
      </div>
      <div className="rounded-md border overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    records.length > 0 &&
                    selectedRecordIds.size === records.length
                  }
                  onCheckedChange={onToggleSelectAll}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead>序号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>身份证号</TableHead>
              <TableHead>银行卡号</TableHead>
              <TableHead>账户银行</TableHead>
              <TableHead>实发金额</TableHead>
              <TableHead className="sticky right-0 bg-muted z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无记录，请先添加人员
                </TableCell>
              </TableRow>
            ) : (
              pagedRecords.map((record, index) => (
                <TableRow key={record.recordId} className="group">
                  <TableCell>
                    <Checkbox
                      checked={selectedRecordIds.has(record.recordId)}
                      onCheckedChange={() => onToggleSelect(record.recordId)}
                      aria-label="选择"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {safePageIndex * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="font-medium truncate" title={record.name}>{record.name}</TableCell>
                  <TableCell className="font-mono text-xs truncate" title={record.phoneNumber || ""}>
                    {record.phoneNumber || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate" title={record.idCardNumber || ""}>
                    {record.idCardNumber || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate" title={record.payrollCardNumber || ""}>
                    {record.payrollCardNumber || "-"}
                  </TableCell>
                  <TableCell className="text-sm truncate" title={record.bankName || ""}>
                    {record.bankName || "-"}
                  </TableCell>
                  <TableCell>
                    {editingId === record.recordId && editingField === "netPay" ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={saving}
                          className="w-24 h-8"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={saveEdit}
                          disabled={saving}
                          aria-label="保存实发工资"
                        >
                          <Check className="size-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={cancelEdit}
                          disabled={saving}
                          aria-label="取消编辑实发工资"
                        >
                          <X className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="group w-full cursor-pointer text-left font-mono hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => startEdit(record, "netPay")}
                        aria-label={`编辑${record.name}的实发工资`}
                      >
                        ¥{record.netPay.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <Edit3 className="size-3 inline ml-1 opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-background group-hover:bg-muted/50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`移除${record.name}`}
                      onClick={() => handleRemoveOne(record.personnelId)}
                      disabled={removing}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {records.length > 0 && (
          <TablePaginationFooter
            onPageIndexChange={handlePageIndexChange}
            onPageSizeChange={handlePageSizeChange}
            pageIndex={safePageIndex}
            pageSize={pageSize}
            totalCount={records.length}
            totalPages={totalPages}
          />
        )}
      </div>
    </div>
  );
}
