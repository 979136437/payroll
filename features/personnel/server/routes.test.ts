import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), importPeople: vi.fn() }));
vi.mock("./repository", () => ({ personnelRepository: repository }));
import { GET, POST, DELETE } from "@/app/api/personnel/route";
import { PUT } from "@/app/api/personnel/[id]/route";
import { POST as IMPORT } from "@/app/api/personnel/import/route";
import { GET as EXPORT } from "@/app/api/personnel/export/route";
import { readRoster, writeRoster } from "./workbook";
import { PersonnelError } from "./errors";

const person = { name: "测试人员", gender: "男", ethnicity: "汉族", nativePlace: "", idCardNumber: "001234567890123456", salaryCardNumber: "00123456789012345678", bankName: "", phone: "00123456789" };
function request(method: string, body: unknown) { return new Request("http://localhost/api/personnel", { method, body: JSON.stringify(body) }); }
beforeEach(() => { vi.resetAllMocks(); repository.list.mockResolvedValue([{ ...person, id: "1" }]); });
describe("人员接口", () => {
  it("搜索敏感字段并返回分页与总数", async () => {
    repository.list.mockResolvedValue(Array.from({ length: 12 }, (_, index) => ({ ...person, id: String(index + 1) })));
    const response = await GET(new Request("http://localhost/api/personnel?query=001234&page=2&pageSize=5"));
    expect(await response.json()).toMatchObject({ page: 2, pages: 3, total: 12, totalPeople: 12, items: expect.any(Array) });
    const empty = await GET(new Request("http://localhost/api/personnel?query=不存在"));
    expect(await empty.json()).toMatchObject({ items: [], total: 0, totalPeople: 12 });
  });
  it("新增由数据库分配ID，编辑验证ID", async () => {
    repository.create.mockResolvedValue("8");
    expect((await POST(request("POST", person))).status).toBe(201);
    expect(repository.create).toHaveBeenCalledWith(person);
    expect((await PUT(request("PUT", person), { params: Promise.resolve({ id: "8" }) })).status).toBe(200);
    expect(repository.update).toHaveBeenCalledWith(8, person);
    expect((await PUT(request("PUT", person), { params: Promise.resolve({ id: "bad" }) })).status).toBe(400);
    expect((await POST(request("POST", { ...person, id: "5" }))).status).toBe(400);
  });
  it("批量删除统一去重并返回关联错误", async () => {
    expect((await DELETE(request("DELETE", { ids: ["1","1","2"] }))).status).toBe(200);
    expect(repository.remove).toHaveBeenCalledWith([1,2]);
    repository.remove.mockRejectedValue({ code: "ER_ROW_IS_REFERENCED_2" });
    expect((await DELETE(request("DELETE", { ids: ["1"] }))).status).toBe(409);
    expect((await DELETE(request("DELETE", null))).status).toBe(400);
  });
  it("导入先完整校验再一次提交业务层", async () => {
    const body = new Uint8Array(await writeRoster([person], "", "2026-09"));
    const response = await IMPORT(new Request("http://localhost/api/personnel/import", { method: "POST", body }));
    expect(await response.json()).toEqual({ count: 1 });
    expect(repository.importPeople).toHaveBeenCalledWith([{ row: 4, person }]);
    repository.importPeople.mockClear();
    const invalid = new Uint8Array(await writeRoster([person,person], "", "2026-09"));
    expect((await IMPORT(new Request("http://localhost/api/personnel/import", { method: "POST", body: invalid }))).status).toBe(400);
    expect(repository.importPeople).not.toHaveBeenCalled();
  });
  it("数据库重复导入返回行号，并发唯一冲突返回409", async () => {
    const body = new Uint8Array(await writeRoster([person], "", "2026-09"));
    repository.importPeople.mockRejectedValue(new PersonnelError("重复", 409, [{ row: 4, field: "姓名", message: "姓名已存在" }]));
    const response = await IMPORT(new Request("http://localhost/api/personnel/import", { method: "POST", body }));
    expect(response.status).toBe(409);
    expect((await response.json()).issues[0].row).toBe(4);
    repository.create.mockRejectedValue({ cause: { code: "ER_DUP_ENTRY" } });
    expect((await POST(request("POST", person))).status).toBe(409);
  });
  it("导出忽略分页、保留搜索结果，模板无需数据库", async () => {
    repository.list.mockResolvedValue(Array.from({ length: 12 }, (_, index) => ({ ...person, name: `测试${index}`, id: String(index + 1) })));
    const response = await EXPORT(new Request("http://localhost/api/personnel/export?query=测试&pageSize=5&month=2026-09"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("filename*");
    expect(await readRoster(Buffer.from(await response.arrayBuffer()))).toHaveLength(12);
    repository.list.mockClear();
    expect((await EXPORT(new Request("http://localhost/api/personnel/export?template=1"))).status).toBe(200);
    expect(repository.list).not.toHaveBeenCalled();
  });
});
