import { describe, expect, it } from "vitest";
import { createInitialData } from "@/features/demo/initial-data";
import { normalizePerson, paginate, searchPeople } from "./personnel";

describe("人员搜索与分页", () => {
  const people = createInitialData().people;
  it("支持四种搜索字段与首尾空白", () => {
    for (const value of ["张示例", "演示电话-1", "演示证件-1", "演示卡号-1"]) {
      expect(searchPeople(people, ` ${value} `)).toEqual([people[0]]);
    }
    expect(searchPeople(people, "不存在")).toEqual([]);
    expect(searchPeople(people, " ")).toHaveLength(6);
  });
  it("限制页码，处理空数据和异常分页参数", () => {
    expect(paginate(people, 2, 5)).toEqual({ page: 2, pages: 2, items: [people[5]] });
    expect(paginate(people, 100, 5).page).toBe(2);
    expect(paginate(people, -1, 5).page).toBe(1);
    expect(paginate([], 20)).toEqual({ page: 1, pages: 1, items: [] });
    expect(paginate(people, NaN, NaN).items).toHaveLength(6);
    expect(paginate(people, 1, 0).items).toHaveLength(1);
  });
  it("清洗字段并拒绝空白姓名和超长输入", () => {
    expect(normalizePerson({ ...people[0], name: " 张示例 ", phone: " 电话 " }).phone).toBe("电话");
    expect(() => normalizePerson({ ...people[0], name: "　 " })).toThrow("姓名不能为空");
    expect(() => normalizePerson({ ...people[0], phone: "1".repeat(101) })).toThrow("100个字符");
  });
});
