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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Personnel, CreatePersonnelInput } from "@/lib/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel?: Personnel | null;
  onSubmit: (data: CreatePersonnelInput) => Promise<void>;
};

const createInitialForm = (
  personnel?: Personnel | null
): CreatePersonnelInput => ({
  name: personnel?.name ?? "",
  gender: personnel?.gender ?? "",
  ethnicity: personnel?.ethnicity ?? "",
  nativePlace: personnel?.nativePlace ?? "",
  idCardNumber: personnel?.idCardNumber ?? "",
  payrollCardNumber: personnel?.payrollCardNumber ?? "",
  bankName: personnel?.bankName ?? "",
  jobType: personnel ? personnel.jobType ?? "" : "砌砖",
  startDate: personnel?.startDate ?? "",
  endDate: personnel?.endDate ?? "",
  phoneNumber: personnel?.phoneNumber ?? "",
  remark: personnel?.remark ?? "",
});

export function PersonnelFormDialog({
  open,
  onOpenChange,
  personnel,
  onSubmit,
}: Props) {
  return (
    <PersonnelFormDialogState
      key={`${open ? "open" : "closed"}-${personnel?.id ?? "new"}`}
      open={open}
      onOpenChange={onOpenChange}
      personnel={personnel}
      onSubmit={onSubmit}
    />
  );
}

function PersonnelFormDialogState({
  open,
  onOpenChange,
  personnel,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreatePersonnelInput>(() =>
    createInitialForm(personnel)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("姓名不能为空");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // 保存期间保持当前会话，避免旧请求完成后关闭后续弹窗。
    if (!nextOpen && loading) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        showCloseButton={!loading}
      >
        <DialogHeader>
          <DialogTitle>{personnel ? "编辑人员" : "新增人员"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">
                姓名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gender">性别</Label>
              <Input
                id="gender"
                value={form.gender ?? ""}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ethnicity">民族</Label>
              <Input
                id="ethnicity"
                value={form.ethnicity ?? ""}
                onChange={(e) =>
                  setForm({ ...form, ethnicity: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nativePlace">籍贯</Label>
              <Textarea
                id="nativePlace"
                value={form.nativePlace ?? ""}
                onChange={(e) =>
                  setForm({ ...form, nativePlace: e.target.value })
                }
                disabled={loading}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idCardNumber">身份证号码</Label>
              <Input
                id="idCardNumber"
                value={form.idCardNumber ?? ""}
                onChange={(e) =>
                  setForm({ ...form, idCardNumber: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payrollCardNumber">工资卡号</Label>
              <Input
                id="payrollCardNumber"
                value={form.payrollCardNumber ?? ""}
                onChange={(e) =>
                  setForm({ ...form, payrollCardNumber: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bankName">开户行</Label>
              <Input
                id="bankName"
                value={form.bankName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, bankName: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phoneNumber">联系电话</Label>
              <Input
                id="phoneNumber"
                value={form.phoneNumber ?? ""}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <input
              type="hidden"
              id="jobType"
              value={form.jobType ?? ""}
              onChange={(e) =>
                setForm({ ...form, jobType: e.target.value })
              }
            />
            <input
              type="hidden"
              id="startDate"
              value={form.startDate ?? ""}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
            <input
              type="hidden"
              id="endDate"
              value={form.endDate ?? ""}
              onChange={(e) =>
                setForm({ ...form, endDate: e.target.value })
              }
            />
            <input
              type="hidden"
              id="remark"
              value={form.remark ?? ""}
              onChange={(e) =>
                setForm({ ...form, remark: e.target.value })
              }
            />
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
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
