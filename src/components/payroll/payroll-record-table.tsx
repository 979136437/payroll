"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import type { PayrollSheetRecordRow } from "@/lib/types";
import { payrollApi } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, Edit3, Check, X } from "lucide-react";

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
  const [editingField, setEditingField] = useState<"netPay" | "exportWeight" | null>(
    null
  );
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const totalNetPay = records.reduce((sum, r) => sum + r.netPay, 0);

  const startEdit = (
    record: PayrollSheetRecordRow,
    field: "netPay" | "exportWeight"
  ) => {
    setEditingId(record.recordId);
    setEditingField(field);
    const value = field === "netPay" ? record.netPay : record.exportWeight;
    setEditValue(value != null ? String(value) : "");
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
        const value = parseFloat(editValue);
        if (isNaN(value)) {
          toast.error("请输入有效的金额");
          return;
        }
        await payrollApi.updateNetPay(editingId, value);
      } else if (editingField === "exportWeight") {
        const value = editValue.trim() === "" ? null : parseInt(editValue);
        if (editValue.trim() !== "" && isNaN(value as number)) {
          toast.error("请输入有效的序号");
          return;
        }
        await payrollApi.updateExportWeight(editingId, value as number | null);
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
    if (selectedRecordIds.size === 0) return;
    try {
      await payrollApi.removePersonnel(sheetId, Array.from(selectedRecordIds));
      toast.success(`已移除 ${selectedRecordIds.size} 人`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "移除失败");
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
          >
            <Trash2 className="size-4 mr-2" />
            移除选中 ({selectedRecordIds.size})
          </Button>
        )}
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableHead className="w-16">序号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>身份证号</TableHead>
              <TableHead>银行卡号</TableHead>
              <TableHead>账户银行</TableHead>
              <TableHead className="w-28 text-right">实发金额</TableHead>
              <TableHead className="w-24 text-center">导出序号</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead className="w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无记录，请先添加工员
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => (
                <TableRow key={record.recordId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRecordIds.has(record.recordId)}
                      onCheckedChange={() => onToggleSelect(record.recordId)}
                      aria-label="选择"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.idCardNumber || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.payrollCardNumber || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {record.bankName || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === record.recordId && editingField === "netPay" ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={saving}
                          className="w-24 text-right h-8"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          <Check className="size-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:text-primary font-mono"
                        onClick={() => startEdit(record, "netPay")}
                      >
                        ¥{record.netPay.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <Edit3 className="size-3 inline ml-1 opacity-0 group-hover:opacity-100" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingId === record.recordId && editingField === "exportWeight" ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={saving}
                          className="w-16 text-center h-8"
                          placeholder="-"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          <Check className="size-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => startEdit(record, "exportWeight")}
                      >
                        {record.exportWeight != null ? (
                          <Badge variant="secondary">{record.exportWeight}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {record.phoneNumber || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        try {
                          await payrollApi.removePersonnel(sheetId, [
                            record.personnelId,
                          ]);
                          toast.success("已移除");
                          onRefresh();
                        } catch (e: any) {
                          toast.error(e.message || "移除失败");
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
