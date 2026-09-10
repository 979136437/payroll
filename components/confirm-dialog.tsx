"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "./form-dialog";

export function ConfirmDialog({ title, description, onClose, onConfirm, pending = false, error }: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
  error?: string;
}) {
  return (
    <FormDialog title={title} description={description} onClose={() => { if (!pending) onClose(); }}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={onClose} autoFocus>取消</Button>
        <Button variant="destructive" disabled={pending} onClick={async () => { try { await onConfirm(); onClose(); } catch { /* 调用方保留弹窗并显示业务错误。 */ } }}>{pending ? "删除中…" : "确认删除"}</Button>
      </DialogFooter>
    </FormDialog>
  );
}
