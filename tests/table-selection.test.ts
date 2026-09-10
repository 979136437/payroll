import { describe, expect, it } from "vitest";
import { toRowSelection, updateSelectedIds } from "@/lib/table-selection";

describe("表格受控选择转换", () => {
  it("去重并保留当前页以外的选择", () => {
    expect(toRowSelection(["a", "a", "other-page"])).toEqual({ a: true, "other-page": true });
    expect(toRowSelection([])).toEqual({});
  });
  it("支持直接替换和函数更新且不修改原状态", () => {
    const current = toRowSelection(["a", "b"]);
    expect(updateSelectedIds({ c: true }, current)).toEqual(["c"]);
    expect(updateSelectedIds((previous) => {
      const next = { ...previous };
      delete next.a;
      return next;
    }, current)).toEqual(["b"]);
    expect(current).toEqual({ a: true, b: true });
    expect(updateSelectedIds({}, current)).toEqual([]);
  });
});
