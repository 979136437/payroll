"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "./form-dialog";

export function ConfirmDialog({ title, description, onClose, onConfirm }: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <FormDialog title={title} description={description} onClose={onClose}>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} autoFocus>取消</Button>
        <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>确认删除</Button>
      </DialogFooter>
    </FormDialog>
  );
}
