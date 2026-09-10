import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSensitive, decryptSensitive } from "./crypto";
import { parsePerson, parseId, parseIds, parseQuery } from "./validation";
import { handle, readBody, readJson } from "./http";
import { PersonnelError } from "./errors";

const person = { name: "测试人员", gender: "男", ethnicity: "汉族", nativePlace: "测试", idCardNumber: "001234567890123456", salaryCardNumber: "00123456789012345678", bankName: "测试银行", phone: "00123456789" };
beforeEach(() => vi.stubEnv("PERSONNEL_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64")));
afterEach(() => vi.unstubAllEnvs());

describe("人员敏感资料加密", () => {
  it("往返保留号码文本，重复加密产生不同密文", () => {
    const sensitive = { idCardNumber: person.idCardNumber, salaryCardNumber: person.salaryCardNumber, phone: person.phone };
    const first = encryptSensitive(sensitive);
    expect(first).not.toContain(person.idCardNumber);
    expect(decryptSensitive(first)).toEqual(sensitive);
    expect(encryptSensitive(sensitive)).not.toBe(first);
    expect(decryptSensitive(null)).toEqual({ idCardNumber: "", salaryCardNumber: "", phone: "" });
  });
  it.each(["", "bad", Buffer.alloc(16).toString("base64")])("拒绝无效密钥", key => {
    vi.stubEnv("PERSONNEL_ENCRYPTION_KEY", key);
    expect(() => encryptSensitive(person)).toThrow("密钥");
    expect(() => decryptSensitive(null)).toThrow("密钥");
  });
  it("错误密钥和篡改不能回退明文", () => {
    const encrypted = encryptSensitive(person);
    for (const value of ["{}", "明文", '{"v":2}', JSON.stringify({ ...JSON.parse(encrypted), tag: "AA==" }), JSON.stringify({ ...JSON.parse(encrypted), iv: "AA==" }), JSON.stringify({ ...JSON.parse(encrypted), data: "AAAA" })]) {
      expect(() => decryptSensitive(value)).toThrow("解密失败");
    }
    const invalidFields = encryptSensitive({ idCardNumber: 3, salaryCardNumber: "", phone: "" } as never);
    expect(() => decryptSensitive(invalidFields)).toThrow("解密失败");
    vi.stubEnv("PERSONNEL_ENCRYPTION_KEY", Buffer.alloc(32, 2).toString("base64"));
    expect(() => decryptSensitive(encrypted)).toThrow("解密失败");
  });
});
describe("接口输入校验", () => {
  it("统一去空白且不改变号码", () => expect(parsePerson({ ...person, name: " 测试人员 " })).toEqual(person));
  it.each([{ name: " " }, { name: "a".repeat(101) }, { name: 3 }, { phone: "\0" }, { unknown: true }])("拒绝无效人员字段", patch => expect(() => parsePerson({ ...person, ...patch })).toThrow());
  it.each(["0", "-1", "1.5", "01", "2147483648", 1, null])("拒绝无效编号", id => expect(() => parseId(id)).toThrow());
  it("编号去重并限制数量", () => {
    expect(parseId("1")).toBe(1);
    expect(parseIds(["1","1","2"])).toEqual([1,2]);
    for (const value of [null, [], Array(5001).fill("1")]) expect(() => parseIds(value)).toThrow();
  });
  it("校验分页和搜索", () => {
    expect(parseQuery(new URL("http://localhost"))).toEqual({ query: "", page: 1, pageSize: 10 });
    expect(parseQuery(new URL("http://localhost?query=test&page=2&pageSize=20"))).toEqual({ query: "test", page: 2, pageSize: 20 });
    for (const query of ["page=0", "page=1.5", "pageSize=100", `query=${"a".repeat(101)}`]) expect(() => parseQuery(new URL(`http://localhost?${query}`))).toThrow();
  });
});
describe("HTTP边界与错误", () => {
  it("读取JSON并拒绝跨站提交及超限内容", async () => {
    const request = (body: string, headers = {}) => new Request("http://localhost", { method: "POST", body, headers });
    expect(await readJson(request('{"ids":["1"]}'))).toEqual({ ids: ["1"] });
    await expect(readJson(request("{"))).rejects.toThrow("JSON");
    await expect(readJson(request("{}", { origin: "http://other" }))).rejects.toThrow("跨站");
    expect(await readJson(request("{}", { origin: "http://localhost" }))).toEqual({});
    await expect(readBody(request("abc"), 2)).rejects.toThrow("大小");
    await expect(readBody(request("a", { "content-length": "10" }), 2)).rejects.toThrow("大小");
    await expect(readBody(new Request("http://localhost"), 2)).rejects.toThrow("为空");
  });
  it("响应不缓存且隐藏数据库内部信息", async () => {
    const response = await handle(async () => Response.json({ ok: true }));
    expect(response.headers.get("cache-control")).toBe("no-store");
    for (const [error, status, text] of [
      [new PersonnelError("资料无效", 400, [{ row: 4, field: "姓名", message: "必填" }]), 400, "资料无效"],
      [{ cause: { code: "ER_DUP_ENTRY" } }, 409, "姓名已存在"],
      [{ code: "ER_ROW_IS_REFERENCED_2" }, 409, "关联工资"],
      [new Error("数据库密码不可外泄"), 500, "操作失败"],
    ] as const) {
      const result = await handle(async () => { throw error; });
      expect(result.status).toBe(status);
      expect((await result.json()).message).toContain(text);
    }
  });
});
