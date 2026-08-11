"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { PayrollSheetSummary } from "@/lib/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSheets: PayrollSheetSummary[];
  onCreate: (name: string, sourceSheetId: number | null) => Promise<void>;
};

export function CreatePayrollSheetDialog({
  open,
  onOpenChange,
  existingSheets,
  onCreate,
}: Props) {
  return (
    <CreatePayrollSheetDialogState
      key={open ? "open" : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      existingSheets={existingSheets}
      onCreate={onCreate}
    />
  );
}

function CreatePayrollSheetDialogState({
  open,
  onOpenChange,
  existingSheets,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [sourceSheetId, setSourceSheetId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("工资表名称不能为空");
      return;
    }
    setLoading(true);
    try {
      await onCreate(name.trim(), sourceSheetId ? Number(sourceSheetId) : null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建工资表</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">
              工资表名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：2026年6月"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source">复制来源（可选）</Label>
            <Select
              value={sourceSheetId}
              onValueChange={(value) => setSourceSheetId(value ?? "")}
              disabled={loading || existingSheets.length === 0}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="不复制，创建空表" />
              </SelectTrigger>
              <SelectContent>
                {existingSheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={String(sheet.id)}>
                    {sheet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {existingSheets.length === 0 && (
              <p className="text-xs text-muted-foreground">
                暂无可复制的工资表
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
