import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PayrollRecordTable } from "@/components/payroll/payroll-record-table";
import { payrollApi } from "@/lib/api";
import { toast } from "sonner";

vi.mock("@/lib/api", () => ({
  payrollApi: {
    removePersonnel: vi.fn(),
    updateNetPay: vi.fn(),
  },
  personnelApi: {},
}));

const records = [
  {
    recordId: 11,
    personnelId: 101,
    name: "张三",
    idCardNumber: "ID-1",
    payrollCardNumber: "CARD-1",
    bankName: "工行",
    exportWeight: null,
    attendanceDays: null,
    wageStandard: null,
    grossPay: null,
    deductionAmount: null,
    phoneNumber: "138",
    netPay: 100,
    payeeSignature: null,
    remark: null,
  },
] as any;

describe("PayrollRecordTable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("shows empty state", () => {
    render(
      <PayrollRecordTable
        records={[]}
        sheetId={1}
        selectedRecordIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText("暂无记录，请先添加人员")).toBeInTheDocument();
  });

  test("edits net pay and refreshes on success", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    vi.mocked(payrollApi.updateNetPay).mockResolvedValue(records[0]);

    render(
      <PayrollRecordTable
        records={records}
        sheetId={1}
        selectedRecordIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onRefresh={onRefresh}
      />
    );

    await user.click(screen.getAllByText("¥100.00")[1]);
    const input = screen.getByDisplayValue("100");
    await user.clear(input);
    await user.type(input, "120");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(payrollApi.updateNetPay).toHaveBeenCalledWith(11, 120);
      expect(onRefresh).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("保存成功");
    });
  });

  test("opens net pay editing from the keyboard", async () => {
    const user = userEvent.setup();

    render(
      <PayrollRecordTable
        records={records}
        sheetId={1}
        selectedRecordIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const editButton = screen.getByRole("button", {
      name: "编辑张三的实发工资",
    });
    editButton.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByDisplayValue("100")).toHaveFocus();
    expect(screen.getByRole("button", { name: "保存实发工资" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消编辑实发工资" })).toBeInTheDocument();
  });

  test("shows validation and remove selected flow", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    vi.mocked(payrollApi.removePersonnel).mockResolvedValue({ success: true } as any);

    render(
      <PayrollRecordTable
        records={records}
        sheetId={1}
        selectedRecordIds={new Set([11])}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onRefresh={onRefresh}
      />
    );

    await user.click(screen.getAllByText("¥100.00")[1]);
    const input = screen.getByDisplayValue("100");
    await user.clear(input);
    fireEvent.change(input, { target: { value: "" } });
    await user.keyboard("{Enter}");

    expect(toast.error).toHaveBeenCalledWith("请输入有效的金额");
    expect(payrollApi.updateNetPay).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "1e309" } });
    await user.keyboard("{Enter}");

    expect(payrollApi.updateNetPay).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /移除选中/ }));

    await waitFor(() => {
      expect(payrollApi.removePersonnel).toHaveBeenCalledWith(1, [101]);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  test("disables remove actions while a removal is pending", async () => {
    const user = userEvent.setup();
    let resolveRemoval!: (value: { success: boolean }) => void;
    vi.mocked(payrollApi.removePersonnel).mockImplementation(
      () => new Promise((resolve) => {
        resolveRemoval = resolve;
      })
    );

    render(
      <PayrollRecordTable
        records={records}
        sheetId={1}
        selectedRecordIds={new Set([11])}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const removeSelectedButton = screen.getByRole("button", {
      name: /移除选中/,
    });
    await user.click(removeSelectedButton);

    expect(removeSelectedButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "移除张三" })).toBeDisabled();
    expect(payrollApi.removePersonnel).toHaveBeenCalledTimes(1);

    resolveRemoval({ success: true });
    await waitFor(() => expect(removeSelectedButton).toBeEnabled());
  });
});
