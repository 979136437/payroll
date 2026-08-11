import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor } from "@testing-library/react";

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
      onClick={() => {
        void onConfirm({
          personnelIds: [1],
          defaultNetPay: 100,
          perPersonNetPay: { 1: 100 },
        }).catch(() => {
          window.dispatchEvent(new Event("mock-picker-submit-rejected"));
        });
      }}
    >
      mock-add-personnel
    </button>
  ),
}));

vi.mock("@/components/payroll/payroll-record-table", () => ({
  PayrollRecordTable: ({
    records,
    selectedRecordIds,
    onToggleSelect,
    onRefresh,
  }: any) => (
    <div>
      <span>mock-records:{records.length}</span>
      <span>mock-selected:{selectedRecordIds.size}</span>
      <button onClick={() => onToggleSelect(records[0]?.recordId)}>
        mock-select-record
      </button>
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
    expect(window.open).toHaveBeenCalledWith(
      "/api/payroll/2/export",
      "_blank",
      "noopener,noreferrer"
    );

    await user.click(screen.getByRole("button", { name: "刷新工资表" }));
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

  test("clears stale details and does not report success when refresh fails", async () => {
    const user = userEvent.setup();
    vi.mocked(payrollApi.list).mockResolvedValue([
      { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
    ] as any);
    vi.mocked(payrollApi.get)
      .mockResolvedValueOnce({
        sheet: { id: 1, name: "六月工资" },
        records: [{ recordId: 1, personnelId: 1, name: "张三", netPay: 100 }],
      } as any)
      .mockRejectedValueOnce(new Error("刷新失败"));

    render(<HomePage />);
    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "刷新工资表" }));

    expect(await screen.findByText("mock-records:0")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("刷新失败");
    expect(toast.success).not.toHaveBeenCalledWith("已刷新");
  });

  test("drops selected record ids that disappear after refresh", async () => {
    const user = userEvent.setup();
    vi.mocked(payrollApi.list).mockResolvedValue([
      { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
    ] as any);
    vi.mocked(payrollApi.get)
      .mockResolvedValueOnce({
        sheet: { id: 1, name: "六月工资" },
        records: [{ recordId: 11, personnelId: 101, name: "张三", netPay: 100 }],
      } as any)
      .mockResolvedValueOnce({
        sheet: { id: 1, name: "六月工资" },
        records: [],
      } as any);

    render(<HomePage />);
    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();
    await user.click(screen.getByText("mock-select-record"));
    expect(screen.getByText("mock-selected:1")).toBeInTheDocument();

    await user.click(screen.getByText("mock-refresh-records"));

    expect(await screen.findByText("mock-records:0")).toBeInTheDocument();
    expect(screen.getByText("mock-selected:0")).toBeInTheDocument();
  });

  test("keeps the add callback rejected after showing an error", async () => {
    const user = userEvent.setup();
    const rejected = vi.fn();
    window.addEventListener("mock-picker-submit-rejected", rejected);
    vi.mocked(payrollApi.list).mockResolvedValue([
      { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
    ] as any);
    vi.mocked(payrollApi.get).mockResolvedValue({
      sheet: { id: 1, name: "六月工资" },
      records: [],
    } as any);
    vi.mocked(payrollApi.addPersonnel).mockRejectedValue(new Error("添加失败"));

    render(<HomePage />);
    await screen.findByText("mock-records:0");
    await user.click(screen.getByText("mock-add-personnel"));

    await waitFor(() => expect(rejected).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("添加失败");
    window.removeEventListener("mock-picker-submit-rejected", rejected);
  });

  test("does not restore an old sheet after a delayed add completes", async () => {
    const user = userEvent.setup();
    let resolveAdd!: (value: { success: boolean }) => void;
    vi.mocked(payrollApi.list)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
      ] as any)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
        { id: 2, name: "新工资表", personnelCount: 0, totalNetPay: 0, updatedAt: "2" },
      ] as any);
    vi.mocked(payrollApi.get).mockImplementation(async (id) => ({
      sheet: { id, name: id === 1 ? "六月工资" : "新工资表" },
      records: id === 1
        ? [{ recordId: 1, personnelId: 1, name: "张三", netPay: 100 }]
        : [],
    } as any));
    vi.mocked(payrollApi.addPersonnel).mockImplementation(
      () => new Promise((resolve) => {
        resolveAdd = resolve;
      })
    );
    vi.mocked(payrollApi.create).mockResolvedValue({ id: 2, name: "新工资表" } as any);

    render(<HomePage />);
    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();

    await user.click(screen.getByText("mock-add-personnel"));
    await waitFor(() => expect(payrollApi.addPersonnel).toHaveBeenCalledWith(
      1,
      [1],
      { defaultNetPay: 100, perPersonNetPay: { 1: 100 } }
    ));
    await user.click(screen.getByText("mock-create-sheet"));
    await waitFor(() => expect(payrollApi.get).toHaveBeenCalledWith(2));

    await act(async () => {
      resolveAdd({ success: true });
    });

    await waitFor(() => {
      expect(vi.mocked(payrollApi.get).mock.calls.map(([id]) => id)).toEqual([1, 2]);
    });
  });

  test("keeps the new sheet detail when an old sheet deletion completes late", async () => {
    const user = userEvent.setup();
    let resolveDelete!: (value: { deleted: boolean }) => void;
    vi.mocked(payrollApi.list)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
      ] as any)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
        { id: 2, name: "新工资表", personnelCount: 2, totalNetPay: 200, updatedAt: "2" },
      ] as any)
      .mockRejectedValueOnce(new Error("刷新列表失败"));
    vi.mocked(payrollApi.get).mockImplementation(async (id) => ({
      sheet: { id, name: id === 1 ? "六月工资" : "新工资表" },
      records: id === 1
        ? [{ recordId: 1, personnelId: 1, name: "张三", netPay: 100 }]
        : [
            { recordId: 2, personnelId: 2, name: "李四", netPay: 100 },
            { recordId: 3, personnelId: 3, name: "王五", netPay: 100 },
          ],
    } as any));
    vi.mocked(payrollApi.delete).mockImplementation(
      () => new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    vi.mocked(payrollApi.create).mockResolvedValue({ id: 2, name: "新工资表" } as any);

    render(<HomePage />);
    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除工资表" }));
    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);
    await waitFor(() => expect(payrollApi.delete).toHaveBeenCalledWith(1));

    await user.click(screen.getByText("mock-create-sheet"));
    expect(await screen.findByText("mock-records:2")).toBeInTheDocument();

    await act(async () => {
      resolveDelete({ deleted: true });
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("刷新列表失败"));
    expect(screen.getByText("mock-records:2")).toBeInTheDocument();
  });

  test("ignores an older initial sheet list after creation refreshes the list", async () => {
    const user = userEvent.setup();
    let resolveInitialList!: (value: any[]) => void;
    vi.mocked(payrollApi.list)
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveInitialList = resolve;
        })
      )
      .mockResolvedValueOnce([
        { id: 2, name: "新工资表", personnelCount: 2, totalNetPay: 200, updatedAt: "2" },
      ] as any);
    vi.mocked(payrollApi.create).mockResolvedValue({ id: 2, name: "新工资表" } as any);
    vi.mocked(payrollApi.get).mockResolvedValue({
      sheet: { id: 2, name: "新工资表" },
      records: [
        { recordId: 2, personnelId: 2, name: "李四", netPay: 100 },
        { recordId: 3, personnelId: 3, name: "王五", netPay: 100 },
      ],
    } as any);

    render(<HomePage />);
    await user.click(screen.getByText("mock-create-sheet"));
    expect(await screen.findByText("mock-records:2")).toBeInTheDocument();

    await act(async () => {
      resolveInitialList([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
      ]);
    });

    expect(vi.mocked(payrollApi.get).mock.calls.map(([id]) => id)).toEqual([2]);
    expect(screen.getByText("mock-records:2")).toBeInTheDocument();
  });

  test("uses the local remaining sheet when refresh fails after deletion", async () => {
    const user = userEvent.setup();
    vi.mocked(payrollApi.list)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
        { id: 2, name: "七月工资", personnelCount: 2, totalNetPay: 200, updatedAt: "2" },
      ] as any)
      .mockRejectedValueOnce(new Error("刷新列表失败"));
    vi.mocked(payrollApi.get).mockImplementation(async (id) => ({
      sheet: { id, name: id === 1 ? "六月工资" : "七月工资" },
      records: id === 1
        ? [{ recordId: 1, personnelId: 1, name: "张三", netPay: 100 }]
        : [
            { recordId: 2, personnelId: 2, name: "李四", netPay: 100 },
            { recordId: 3, personnelId: 3, name: "王五", netPay: 100 },
          ],
    } as any));
    vi.mocked(payrollApi.delete).mockResolvedValue({ deleted: true } as any);

    render(<HomePage />);
    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除工资表" }));
    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);

    expect(await screen.findByText("mock-records:2")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("刷新列表失败");
  });

  test("keeps the newly created sheet when list reconciliation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(payrollApi.list)
      .mockResolvedValueOnce([
        { id: 1, name: "六月工资", personnelCount: 1, totalNetPay: 100, updatedAt: "1" },
      ] as any)
      .mockRejectedValueOnce(new Error("刷新列表失败"));
    vi.mocked(payrollApi.create).mockResolvedValue({
      id: 2,
      name: "新工资表",
      personnelCount: 0,
      totalNetPay: 0,
      updatedAt: "2",
    } as any);
    vi.mocked(payrollApi.get).mockImplementation(async (id) => ({
      sheet: { id, name: id === 1 ? "六月工资" : "新工资表" },
      records: id === 1
        ? [{ recordId: 1, personnelId: 1, name: "张三", netPay: 100 }]
        : [],
    } as any));

    render(<HomePage />);
    expect(await screen.findByText("mock-records:1")).toBeInTheDocument();

    await user.click(screen.getByText("mock-create-sheet"));

    expect(screen.getByRole("combobox")).toHaveTextContent("新工资表");
    expect(await screen.findByText("mock-records:0")).toBeInTheDocument();
    expect(payrollApi.get).toHaveBeenCalledWith(2);
    expect(toast.error).toHaveBeenCalledWith("刷新列表失败");
  });
});
