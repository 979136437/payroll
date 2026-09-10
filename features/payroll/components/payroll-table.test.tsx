// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DemoContext } from "@/features/demo/hooks/use-demo";
import { demoReducer, type DemoAction, type DemoState } from "@/features/demo/model/demo-state";
import { PayrollTable } from "./payroll-table";

afterEach(cleanup);
const people = ["张三", "李四"].map((name, index) => ({
  id: `p${index}`, name, gender: "男", ethnicity: "汉", nativePlace: "", phone: "",
  idCardNumber: "", salaryCardNumber: "", bankName: "",
}));
const payroll = { id: "salary1", name: "工资一", records: [{ personId: "p0", amount: 12345 }, { personId: "p1", amount: null }] };
const initial: DemoState = { people, payrolls: [payroll, { ...payroll, id: "salary2", name: "工资二" }], activeId: payroll.id };
function Harness({ sendSpy = vi.fn() }: { sendSpy?: (action: DemoAction) => void }) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<string[]>([]);
  return <DemoContext value={{ state, send: (action) => { sendSpy(action); setState((previous) => demoReducer(previous, action)); return null; } }}>
    <PayrollTable payroll={state.payrolls.find((item) => item.id === state.activeId)!} selected={selected} onSelection={setSelected} />
    <button onClick={() => { setState((previous) => ({ ...previous, activeId: "salary2" })); setSelected([]); }}>切换工资表</button>
    <button onClick={() => setSelected([])}>清空选择</button>
    <output>{selected.join(",")}</output>
  </DemoContext>;
}
const click = (name: string) => fireEvent.click(screen.getByRole("checkbox", { name }));
describe("工资表", () => {
  it("保留表头、金额和选择行为", () => {
    render(<Harness />);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["", "序号", "姓名", "联系电话", "身份证号", "银行卡号", "账户银行", "实发金额", "操作"]);
    expect(screen.getByText("123.45")).toBeTruthy();
    expect(screen.getByText("未填写")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(8);
    click("选择 张三");
    expect(screen.getByRole("checkbox", { name: "全选工资记录" }).getAttribute("aria-checked")).toBe("mixed");
    click("选择 张三");
    expect(screen.getByRole("status").textContent).toBe("");
    click("全选工资记录");
    expect(screen.getByRole("status").textContent).toBe("p0,p1");
    click("全选工资记录");
    expect(screen.getByRole("status").textContent).toBe("");
    click("选择 李四");
    fireEvent.click(screen.getByText("清空选择"));
    expect(screen.getByRole("checkbox", { name: "选择 李四" }).getAttribute("aria-checked")).toBe("false");
  });
  it("选择及数据更新不丢失编辑输入，切换工资表重置编辑器", () => {
    const sendSpy = vi.fn();
    render(<Harness sendSpy={sendSpy} />);
    fireEvent.click(screen.getByRole("button", { name: "编辑张三的实发工资" }));
    const input = screen.getByRole("textbox", { name: "张三的实发工资" });
    fireEvent.change(input, { target: { value: "456.78" } });
    click("选择 张三");
    click("全选工资记录");
    expect(screen.getByRole("textbox", { name: "张三的实发工资" })).toBe(input);
    expect((input as HTMLInputElement).value).toBe("456.78");
    fireEvent.click(screen.getByRole("button", { name: "移除李四" }));
    expect(screen.getByRole("textbox", { name: "张三的实发工资" })).toBe(input);
    expect((input as HTMLInputElement).value).toBe("456.78");
    fireEvent.click(screen.getByRole("button", { name: "保存实发工资" }));
    expect(sendSpy).toHaveBeenCalledWith({ type: "amount", id: "salary1", personId: "p0", amount: 45678 });
    expect(screen.getByText("456.78")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "编辑张三的实发工资" }));
    fireEvent.click(screen.getByText("切换工资表"));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("123.45")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
  });
  it("移除发送正确记录并清理选择", () => {
    const sendSpy = vi.fn();
    render(<Harness sendSpy={sendSpy} />);
    click("全选工资记录");
    fireEvent.click(screen.getByRole("button", { name: "移除张三" }));
    expect(sendSpy).toHaveBeenCalledWith({ type: "removeRecords", id: "salary1", ids: ["p0"] });
    expect(screen.queryByText("张三")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("p1");
  });
  it("空态及缺失人员保持原序号和全选范围", () => {
    const onSelection = vi.fn();
    const view = (records: typeof payroll.records) => <DemoContext value={{ state: initial, send: vi.fn() }}>
      <PayrollTable payroll={{ ...payroll, records }} selected={[]} onSelection={onSelection} />
    </DemoContext>;
    const { rerender } = render(view([]));
    expect(screen.getByText("暂无记录，请先添加人员").getAttribute("colspan")).toBe("9");
    rerender(view([{ personId: "missing", amount: null }, payroll.records[0]]));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(within(screen.getByText("张三").closest("tr")!).getByText("2")).toBeTruthy();
    click("全选工资记录");
    expect(onSelection).toHaveBeenCalledWith(["missing", "p0"]);
  });
});
