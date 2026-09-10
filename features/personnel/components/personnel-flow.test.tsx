// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersonForm } from "./person-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PersonnelPage } from "./personnel-page";
import { ImportRosterDialog, ExportRosterDialog } from "./roster-dialogs";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mount(content: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{content}</QueryClientProvider>);
}
describe("人员真实数据交互", () => {
  it("保存失败保留资料，再次保存成功才关闭", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "姓名已存在" }, { status: 409 })).mockResolvedValueOnce(Response.json({ id: "1" }, { status: 201 }));
    const close = vi.fn();
    mount(<PersonForm onClose={close} />);
    fireEvent.change(screen.getByLabelText(/姓名/), { target: { value: "测试人员" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("姓名已存在")).toBeTruthy();
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/姓名/) as HTMLInputElement).value).toBe("测试人员");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).not.toHaveProperty("id");
  });
  it("异步删除失败不关闭弹窗", async () => {
    const close = vi.fn();
    mount(<ConfirmDialog title="删除人员" description="测试" onClose={close} onConfirm={async () => { throw new Error("关联记录"); }} />);
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(close).not.toHaveBeenCalled();
  });
  it("列表失败可重试，成功展示真实人员而非演示资料", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "数据库暂不可用" }, { status: 503 })).mockResolvedValue(Response.json({ items: [{ id: "1", name: "接口人员", gender: "男", ethnicity: "", nativePlace: "", idCardNumber: "", salaryCardNumber: "", bankName: "", phone: "" }], page: 1, pages: 1, total: 1, totalPeople: 1 }));
    mount(<PersonnelPage />);
    expect(await screen.findByText("数据库暂不可用")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByText("接口人员")).toBeTruthy();
    expect(screen.queryByText(/刷新页面后恢复/)).toBeNull();
  });
  it("网络异常使用中文提示", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    mount(<PersonnelPage />);
    expect(await screen.findByText("网络连接失败，请稍后重试")).toBeTruthy();
  });
  it("导入校验失败显示行号，不关闭弹窗", async () => {
    const close = vi.fn();
    fetchMock.mockResolvedValue(Response.json({ message: "导入失败", issues: [{ row: 8, field: "姓名", message: "姓名已存在" }] }, { status: 409 }));
    mount(<ImportRosterDialog onClose={close} />);
    fireEvent.change(screen.getByLabelText("花名册文件"), { target: { files: [new File(["虚构内容"], "花名册.xlsx")] } });
    fireEvent.click(screen.getByRole("button", { name: "导入" }));
    expect(await screen.findByText("第8行 · 姓名：姓名已存在")).toBeTruthy();
    expect(close).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(File);
  });
  it("导出传递当前搜索与编制信息，失败保留弹窗", async () => {
    const close = vi.fn();
    fetchMock.mockResolvedValue(Response.json({ message: "导出暂不可用" }, { status: 503 }));
    mount(<ExportRosterDialog query="测试" onClose={close} />);
    fireEvent.change(screen.getByLabelText("编制单位（可留空）"), { target: { value: "测试单位" } });
    fireEvent.click(screen.getByRole("button", { name: "导出" }));
    expect(await screen.findByText("导出暂不可用")).toBeTruthy();
    const url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("query")).toBe("测试");
    expect(url.searchParams.get("unit")).toBe("测试单位");
    expect(url.searchParams.has("page")).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });
});
