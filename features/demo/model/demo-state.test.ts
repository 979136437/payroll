import { describe, expect, it } from "vitest";
import { createInitialData } from "../initial-data";
import { demoReducer } from "./demo-state";

describe("跨页面演示状态", () => {
  it("每次初始化创建独立数据", () => {
    const first = createInitialData();
    first.people[0].name = "修改";
    expect(createInitialData().people[0].name).toBe("张示例");
  });
  it("新增和编辑人员，删除时同步清理工资记录", () => {
    const state = createInitialData();
    const added = demoReducer(state, { type: "savePerson", person: { ...state.people[0], id: "new", name: "新增示例" } });
    expect(added.people).toHaveLength(7);
    const edited = demoReducer(added, { type: "savePerson", person: { ...added.people[0], name: "修改示例" } });
    expect(edited.people[0].name).toBe("修改示例");
    const deleted = demoReducer(edited, { type: "deletePeople", ids: ["person-1", "new"] });
    expect(deleted.people).toHaveLength(5);
    expect(deleted.payrolls[0].records).toHaveLength(2);
    expect(state.people).toHaveLength(6);
  });
  it("创建、选择、删除工资表及最后一张表的回退", () => {
    const state = createInitialData();
    const created = demoReducer(state, { type: "create", id: "new", name: "副本", sourceId: state.activeId });
    expect(created.activeId).toBe("new");
    expect(created.payrolls[1].records).toEqual(state.payrolls[0].records);
    expect(demoReducer(created, { type: "select", id: "missing" }).activeId).toBe("new");
    expect(demoReducer(created, { type: "select", id: "payroll-1" }).activeId).toBe("payroll-1");
    expect(demoReducer(created, { type: "deletePayroll", id: "payroll-1" }).activeId).toBe("new");
    const removed = demoReducer(created, { type: "deletePayroll", id: "new" });
    expect(removed.activeId).toBe("payroll-1");
    expect(demoReducer(removed, { type: "deletePayroll", id: "payroll-1" }).activeId).toBe("");
  });
  it("添加时验证人员存在、去重，并支持金额编辑和移除", () => {
    const state = demoReducer(createInitialData(), { type: "create", id: "empty", name: "空表", sourceId: "" });
    const added = demoReducer(state, { type: "addPeople", id: "payroll-1", ids: ["person-1", "person-4", "person-4", "missing"], amount: 12345 });
    expect(added.payrolls[0].records).toHaveLength(4);
    expect(added.payrolls[1].records).toHaveLength(0);
    const edited = demoReducer(added, { type: "amount", id: "payroll-1", personId: "person-4", amount: null });
    expect(edited.payrolls[0].records[3].amount).toBeNull();
    const removed = demoReducer(edited, { type: "removeRecords", id: "payroll-1", ids: ["person-1", "person-4"] });
    expect(removed.payrolls[0].records).toHaveLength(2);
  });
  it("无效金额或合计溢出不会修改原状态", () => {
    const state = createInitialData();
    expect(() => demoReducer(state, { type: "amount", id: "payroll-1", personId: "person-1", amount: -1 })).toThrow();
    expect(() => demoReducer(state, { type: "addPeople", id: "payroll-1", ids: ["person-4"], amount: Number.MAX_SAFE_INTEGER })).toThrow();
    expect(state.payrolls[0].records).toHaveLength(3);
    expect(state.payrolls[0].records[0].amount).toBe(520000);
  });
});
