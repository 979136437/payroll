import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import PersonnelPage from "@/app/personnel/page";
import { personnelApi } from "@/lib/api";
import { toast } from "sonner";

vi.mock("@/lib/api", () => ({
  personnelApi: {
    batchDelete: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    exportExcel: vi.fn(() => "/api/personnel/export"),
    importExcel: vi.fn(),
    list: vi.fn(),
    reorder: vi.fn(),
    update: vi.fn(),
  },
  payrollApi: {},
}));

vi.mock("@/components/personnel/personnel-form-dialog", () => ({
  PersonnelFormDialog: ({ personnel, onSubmit }: any) => (
    <button onClick={() => onSubmit({ name: personnel ? "李四" : "王五" })}>
      {personnel ? "mock-edit-submit" : "mock-create-submit"}
    </button>
  ),
}));

describe("PersonnelPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("loads, searches, exports and handles load failure", async () => {
    vi.mocked(personnelApi.list)
      .mockResolvedValueOnce([
        { id: 1, name: "张三", gender: "男", ethnicity: "汉", phoneNumber: "138", idCardNumber: "ID-1", payrollCardNumber: "CARD-1" },
      ] as any)
      .mockRejectedValueOnce(new Error("加载失败"));

    const user = userEvent.setup();

    const { unmount } = render(<PersonnelPage />);

    expect(await screen.findByText("张三")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("搜索姓名、身份证号、工资卡号、电话"), "李四");
    expect(screen.getByText("没有匹配的人员")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("搜索姓名、身份证号、工资卡号、电话"));
    await user.click(screen.getByRole("button", { name: "导出" }));
    expect(window.open).toHaveBeenCalledWith("/api/personnel/export", "_blank");

    unmount();
    render(<PersonnelPage />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("加载失败");
    });
  });

  test("creates, updates, deletes, batch deletes, imports and reorders", async () => {
    const user = userEvent.setup();
    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "张三", gender: "男", ethnicity: "汉", phoneNumber: "138", idCardNumber: "ID-1", payrollCardNumber: "CARD-1" },
      { id: 2, name: "李四", gender: "男", ethnicity: "汉", phoneNumber: "139", idCardNumber: "ID-2", payrollCardNumber: "CARD-2" },
    ] as any);
    vi.mocked(personnelApi.create).mockResolvedValue({ id: 3, name: "王五" } as any);
    vi.mocked(personnelApi.update).mockResolvedValue({ id: 1, name: "李四" } as any);
    vi.mocked(personnelApi.delete).mockResolvedValue({ success: true } as any);
    vi.mocked(personnelApi.batchDelete).mockResolvedValue({ deletedCount: 2 } as any);
    vi.mocked(personnelApi.importExcel).mockResolvedValue({
      createdCount: 1,
      updatedCount: 1,
      skippedCount: 0,
      errors: [],
    });
    vi.mocked(personnelApi.reorder).mockResolvedValue({ success: true } as any);

    render(<PersonnelPage />);

    expect(await screen.findByText("张三")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新增人员" }));
    await user.click(screen.getByText("mock-create-submit"));
    await waitFor(() => {
      expect(personnelApi.create).toHaveBeenCalledWith({ name: "王五" });
      expect(toast.success).toHaveBeenCalledWith("创建成功");
    });

    const rows = screen.getAllByRole("row");
    await user.click(within(rows[1]).getAllByRole("button")[0]);
    await user.click(screen.getByText("mock-edit-submit"));
    await waitFor(() => {
      expect(personnelApi.update).toHaveBeenCalledWith(1, { name: "李四" });
      expect(toast.success).toHaveBeenCalledWith("更新成功");
    });

    await user.click(within(rows[1]).getByRole("checkbox", { name: "选择" }));
    await user.click(screen.getByRole("button", { name: /删除选中/ }));
    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);
    await waitFor(() => {
      expect(personnelApi.batchDelete).toHaveBeenCalledWith([1]);
      expect(toast.success).toHaveBeenCalledWith("已删除 1 条记录");
    });

    await user.click(within(rows[1]).getAllByRole("button")[1]);
    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);
    await waitFor(() => {
      expect(personnelApi.delete).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("删除成功");
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["demo"], "roster.xlsx");
    await user.upload(fileInput, file);
    await waitFor(() => {
      expect(personnelApi.importExcel).toHaveBeenCalledWith(file);
      expect(toast.success).toHaveBeenCalledWith("导入完成：新增 1 条，更新 1 条，跳过 0 条");
    });

    const draggableRows = screen.getAllByRole("row");
    fireEvent.dragStart(draggableRows[2]);
    fireEvent.dragOver(draggableRows[1]);
    fireEvent.drop(draggableRows[1]);

    await waitFor(() => {
      expect(personnelApi.reorder).toHaveBeenCalledWith([2, 1]);
      expect(toast.success).toHaveBeenCalledWith("排序已保存");
    });
  });

  test("reloads list when reorder fails", async () => {
    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "张三", gender: "男", ethnicity: "汉", phoneNumber: "138", idCardNumber: "ID-1", payrollCardNumber: "CARD-1" },
      { id: 2, name: "李四", gender: "男", ethnicity: "汉", phoneNumber: "139", idCardNumber: "ID-2", payrollCardNumber: "CARD-2" },
    ] as any);
    vi.mocked(personnelApi.reorder).mockRejectedValue(new Error("排序失败"));

    render(<PersonnelPage />);

    await screen.findByText("张三");

    const draggableRows = screen.getAllByRole("row");
    fireEvent.dragStart(draggableRows[2]);
    fireEvent.dragOver(draggableRows[1]);
    fireEvent.drop(draggableRows[1]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("排序失败");
      expect(personnelApi.list).toHaveBeenCalledTimes(2);
    });
  });

  test("reorders the correct personnel while the list is filtered", async () => {
    vi.mocked(personnelApi.list).mockResolvedValue([
      { id: 1, name: "一组张三" },
      { id: 2, name: "李四" },
      { id: 3, name: "一组王五" },
    ] as any);
    vi.mocked(personnelApi.reorder).mockResolvedValue({ success: true } as any);
    const user = userEvent.setup();

    render(<PersonnelPage />);

    await screen.findByText("一组张三");
    await user.type(
      screen.getByPlaceholderText("搜索姓名、身份证号、工资卡号、电话"),
      "一组"
    );

    const filteredRows = screen.getAllByRole("row");
    fireEvent.dragStart(filteredRows[2]);
    fireEvent.dragOver(filteredRows[1]);
    fireEvent.drop(filteredRows[1]);

    await waitFor(() => {
      expect(personnelApi.reorder).toHaveBeenCalledWith([3, 1, 2]);
    });
  });
});
