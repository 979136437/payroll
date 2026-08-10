import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";

import HomePage from "@/app/page";
import { payrollApi } from "@/lib/api";
import { toast } from "sonner";

vi.mock("@/lib/api", () => ({
  payrollApi: {
    addPersonnel: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    exportExcel: vi.fn((id: number) => `/api/payroll/${id}/export`),
    get: vi.fn(),
    list: vi.fn(),
  },
  personnelApi: {
    list: vi.fn(),
  },
}));

vi.mock("@/components/payroll/create-payroll-sheet-dialog", () => ({
  CreatePayrollSheetDialog: ({ onCreate }: any) => (
    <button onClick={() => onCreate("新工资表", null)}>mock-create-sheet</button>
  ),
}));

vi.mock("@/components/payroll/personnel-picker-dialog", () => ({
  PersonnelPickerDialog: ({ onConfirm }: any) => (
    <button
      onClick={() =>
        onConfirm({ personnelIds: [1], defaultNetPay: 100, perPersonNetPay: { 1: 100 } })
      }
    >
      mock-add-personnel
    </button>
  ),
}));

vi.mock("@/components/payroll/payroll-record-table", () => ({
  PayrollRecordTable: ({ records, onRefresh }: any) => (
    <div>
      <span>mock-records:{records.length}</span>
      <button onClick={onRefresh}>mock-refresh-records</button>
    </div>
  ),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("loads sheets and details on mount", async () => {
    vi.mocked(payrollApi.list).mockResolvedValue([
      { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
    ] as any);
    vi.mocked(payrollApi.get).mockResolvedValue({
      sheet: { id: 1, name: "六月工资" },
      records: [{ recordId: 1, personnelId: 1, name: "张三", netPay: 100 }],
    } as any);

    render(<HomePage />);

    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();
    expect(payrollApi.list).toHaveBeenCalled();
    expect(payrollApi.get).toHaveBeenCalledWith(1);
  });

  test("creates sheet, adds personnel, exports, refreshes and deletes", async () => {
    const user = userEvent.setup();

    vi.mocked(payrollApi.list)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
      ] as any)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
        { id: 2, name: "新工资表", personnelCount: 0, totalNetPay: 0, updatedAt: "2" },
      ] as any)
      .mockResolvedValue([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
      ] as any);

    vi.mocked(payrollApi.get).mockResolvedValue({
      sheet: { id: 2, name: "新工资表" },
      records: [],
    } as any);
    vi.mocked(payrollApi.create).mockResolvedValue({
      id: 2,
      name: "新工资表",
    } as any);
    vi.mocked(payrollApi.addPersonnel).mockResolvedValue({ success: true } as any);
    vi.mocked(payrollApi.delete).mockResolvedValue({ deleted: true } as any);

    render(<HomePage />);

    await screen.findByText("mock-records:0");

    await user.click(screen.getByText("mock-create-sheet"));
    await waitFor(() => {
      expect(payrollApi.create).toHaveBeenCalledWith({
        name: "新工资表",
        sourceSheetId: null,
      });
      expect(toast.success).toHaveBeenCalledWith("工资表创建成功");
    });

    await user.click(screen.getByText("mock-add-personnel"));
    await waitFor(() => {
      expect(payrollApi.addPersonnel).toHaveBeenCalledWith(2, [1], {
        defaultNetPay: 100,
        perPersonNetPay: { 1: 100 },
      });
      expect(toast.success).toHaveBeenCalledWith("已添加 1 人");
    });

    await user.click(screen.getByRole("button", { name: "导出 Excel" }));
    expect(window.open).toHaveBeenCalledWith("/api/payroll/2/export", "_blank");

    await user.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("已刷新");
    });

    await user.click(screen.getByRole("button", { name: "删除工资表" }));
    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);
    await waitFor(() => {
      expect(payrollApi.delete).toHaveBeenCalledWith(2);
      expect(toast.success).toHaveBeenCalledWith("工资表已删除");
      expect(payrollApi.get).toHaveBeenCalledWith(1);
    });
  });

  test("shows load error toast", async () => {
    vi.mocked(payrollApi.list).mockRejectedValue(new Error("加载工资表列表失败"));

    render(<HomePage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("加载工资表列表失败");
    });
  });
});
