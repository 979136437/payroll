// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonnelTable } from "./personnel-table";
import type { Person } from "../model/personnel";

afterEach(cleanup);
const people: Person[] = ["张三", "李四", "王五"].map((name, index) => ({
  id: `p${index}`, name, gender: "男", ethnicity: "汉", nativePlace: "", phone: "",
  idCardNumber: "", salaryCardNumber: "", bankName: "",
}));
function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  return <>
    <PersonnelTable people={page === 0 ? people.slice(0, 2) : people.slice(2)} selected={selected}
      onSelection={setSelected} onEdit={() => {}} onDelete={() => {}} searching={false} />
    <button onClick={() => setPage(1 - page)}>翻页</button>
    <button onClick={() => setSelected([])}>清空选择</button>
    <output>{selected.join(",")}</output>
  </>;
}
const click = (name: string) => fireEvent.click(screen.getByRole("checkbox", { name }));
describe("人员表", () => {
  it("保留列、空值及操作参数", () => {
    const onEdit = vi.fn(), onDelete = vi.fn();
    render(<PersonnelTable people={people.slice(0, 1)} selected={[]} onSelection={vi.fn()}
      onEdit={onEdit} onDelete={onDelete} searching={false} />);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["", "姓名", "性别", "民族", "联系电话", "身份证号码", "工资卡号", "操作"]);
    expect(screen.getAllByText("—")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "编辑 张三" }));
    expect(onEdit).toHaveBeenCalledWith(people[0]);
    fireEvent.click(screen.getByRole("button", { name: "删除 张三" }));
    expect(onDelete).toHaveBeenCalledWith(["p0"]);
  });
  it("同步单选、半选、全选，翻页后只取消当前页并响应外部清空", () => {
    render(<Harness />);
    click("选择 张三");
    expect(screen.getByRole("checkbox", { name: "全选当前页" }).getAttribute("aria-checked")).toBe("mixed");
    expect(screen.getByText("张三").closest("tr")?.getAttribute("data-state")).toBe("selected");
    click("选择 张三");
    expect(screen.getByRole("status").textContent).toBe("");
    click("全选当前页");
    expect(screen.getByRole("status").textContent).toBe("p0,p1");
    fireEvent.click(screen.getByText("翻页"));
    click("全选当前页");
    expect(screen.getByRole("status").textContent).toBe("p0,p1,p2");
    click("全选当前页");
    expect(screen.getByRole("status").textContent).toBe("p0,p1");
    fireEvent.click(screen.getByText("翻页"));
    expect(screen.getByRole("checkbox", { name: "全选当前页" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByText("清空选择"));
    expect(screen.getByRole("checkbox", { name: "选择 张三" }).getAttribute("aria-checked")).toBe("false");
  });
  it("区分无数据和搜索无结果", () => {
    const props = { people: [], selected: [], onSelection: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
    const { rerender } = render(<PersonnelTable {...props} searching={false} />);
    expect(screen.getByText("暂无人员数据").getAttribute("colspan")).toBe("8");
    rerender(<PersonnelTable {...props} searching />);
    expect(screen.getByText("没有匹配的人员")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "全选当前页" }).getAttribute("aria-checked")).toBe("false");
  });
});
