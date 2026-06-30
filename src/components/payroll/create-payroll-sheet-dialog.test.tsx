import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";

import { CreatePayrollSheetDialog } from "@/components/payroll/create-payroll-sheet-dialog";
import { toast } from "sonner";

describe("CreatePayrollSheetDialog", () => {
  test("validates blank name before submit", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CreatePayrollSheetDialog
        open
        onOpenChange={vi.fn()}
        existingSheets={[]}
        onCreate={onCreate}
      />
    );

    await user.click(screen.getByRole("button", { name: "创建" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("工资表名称不能为空");
  });

  test("submits trimmed name and closes dialog", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <CreatePayrollSheetDialog
        open
        onOpenChange={onOpenChange}
        existingSheets={[{ id: 1, name: "来源表" } as any]}
        onCreate={onCreate}
      />
    );

    await user.type(screen.getByLabelText(/工资表名称/), "  2026年6月  ");
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith("2026年6月", null);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("shows create error toast", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockRejectedValue(new Error("创建失败"));

    render(
      <CreatePayrollSheetDialog
        open
        onOpenChange={vi.fn()}
        existingSheets={[]}
        onCreate={onCreate}
      />
    );

    await user.type(screen.getByLabelText(/工资表名称/), "工资表");
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("创建失败");
    });
  });
});
