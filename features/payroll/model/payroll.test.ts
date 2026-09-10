import { describe, expect, it } from "vitest";
import { addPeople, copyPayroll, formatAmount, parseAmount, totalAmount, validateAmount } from "./payroll";

describe("工资金额", () => {
  it.each([
    ["", null], [" ", null], ["0", 0], ["0.01", 1], ["1.1", 110],
    [" 12.34 ", 1234], ["0001.09", 109], ["90071992547409.91", Number.MAX_SAFE_INTEGER],
  ])("将 %s 转为整数分", (value, expected) => expect(parseAmount(value as string)).toBe(expected));
  it.each(["-1", "1.001", "NaN", "1e3", "Infinity", ".5", "1.", "1,000", "90071992547409.92", "1".repeat(21)])(
    "拒绝非法金额 %s", (value) => expect(() => parseAmount(value)).toThrow(),
  );
  it.each([-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("拒绝非法整数分 %s", (value) => {
    expect(() => validateAmount(value)).toThrow();
  });
  it("精确显示和汇总金额，未填写计零", () => {
    expect(formatAmount(123456)).toBe("1,234.56");
    expect(formatAmount(0)).toBe("0.00");
    expect(totalAmount([{ personId: "1", amount: 10 }, { personId: "2", amount: 20 }, { personId: "3", amount: null }])).toBe(30);
    expect(() => totalAmount([{ personId: "1", amount: Number.MAX_SAFE_INTEGER }, { personId: "2", amount: 1 }])).toThrow("工资合计超出允许范围");
  });
});

describe("工资表复制与选人", () => {
  it("新建空表、修剪名称并校验名称边界", () => {
    expect(copyPayroll("1", " 新表 ")).toEqual({ id: "1", name: "新表", records: [] });
    expect(() => copyPayroll("1", " ")).toThrow();
    expect(() => copyPayroll("1", "表".repeat(81))).toThrow();
  });
  it("复制后编辑不影响原表", () => {
    const source = { id: "1", name: "原表", records: [{ personId: "a", amount: 100 }] };
    const copy = copyPayroll("2", "副本", source);
    copy.records[0].amount = 200;
    expect(source.records[0].amount).toBe(100);
  });
  it("同时排除已有人员及本次重复选择", () => {
    const source = { id: "1", name: "原表", records: [{ personId: "a", amount: 100 }] };
    expect(addPeople(source, ["a", "b", "b"], null).records).toEqual([{ personId: "a", amount: 100 }, { personId: "b", amount: null }]);
    expect(source.records).toHaveLength(1);
  });
});
