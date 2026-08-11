import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor } from "@testing-library/react";

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

  test("resets draft when the dialog is reopened", async () => {
    const user = userEvent.setup();
    const props = {
      onOpenChange: vi.fn(),
      existingSheets: [],
      onCreate: vi.fn(),
    };
    const { rerender } = render(
      <CreatePayrollSheetDialog open {...props} />
    );

    await user.type(screen.getByLabelText(/工资表名称/), "未保存草稿");
    rerender(<CreatePayrollSheetDialog open={false} {...props} />);
    rerender(<CreatePayrollSheetDialog open {...props} />);

    expect(screen.getByLabelText(/工资表名称/)).toHaveValue("");
  });

  test("prevents closing while creation is in progress", async () => {
    const user = userEvent.setup();
    let resolveCreate!: () => void;
    const onOpenChange = vi.fn();
    const onCreate = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveCreate = resolve;
      })
    );

    render(
      <CreatePayrollSheetDialog
        open
        onOpenChange={onOpenChange}
        existingSheets={[]}
        onCreate={onCreate}
      />
    );
    await user.type(screen.getByLabelText(/工资表名称/), "六月工资");
    await user.click(screen.getByRole("button", { name: "创建" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await act(async () => {
      resolveCreate();
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
