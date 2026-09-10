import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { getDb } from "@/db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", () => ({ getDb: () => state.db }));
vi.mock("server-only", () => ({}));
import { personnelRepository } from "./repository";
import { decryptSensitive, encryptSensitive } from "./crypto";

const person = { name: "测试人员", gender: "男", ethnicity: "汉族", nativePlace: "", idCardNumber: "001234567890123456", salaryCardNumber: "00123456789012345678", bankName: "", phone: "00123456789" };
function fakeDb(rows: unknown[] = []) {
  const query = { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockResolvedValue(rows), for: vi.fn().mockResolvedValue(rows), then: (resolve: (value: unknown[]) => void) => Promise.resolve(rows).then(resolve) };
  const insert = { values: vi.fn().mockReturnThis(), $returningId: vi.fn().mockResolvedValue([{ id: 4 }]) };
  const update = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
  const remove = { where: vi.fn().mockResolvedValue(undefined) };
  const db = { select: vi.fn(() => query), insert: vi.fn(() => insert), update: vi.fn(() => update), delete: vi.fn(() => remove), transaction: vi.fn(async (operation: (tx: unknown) => Promise<void>) => operation(db)) };
  state.db = db;
  return { db, query, insert, update, remove };
}
beforeEach(() => vi.stubEnv("PERSONNEL_ENCRYPTION_KEY", Buffer.alloc(32,1).toString("base64")));
afterEach(() => vi.unstubAllEnvs());
describe("人员仓储适配", () => {
  it("读取映射数据库ID、空字段与密文", async () => {
    fakeDb([{ id: 1, name: person.name, gender: null, ethnicity: null, nativePlace: null, bankName: null, sensitiveInfo: encryptSensitive(person) }]);
    expect(await personnelRepository.list()).toEqual([{ ...person, id: "1", gender: "", ethnicity: "" }]);
    fakeDb([{ ...person, id: 2, sensitiveInfo: null }]);
    expect((await personnelRepository.list())[0]).toMatchObject({ id: "2", gender: "男", idCardNumber: "" });
  });
  it("新增仅写入密文，返回生成编号", async () => {
    const { insert } = fakeDb();
    expect(await personnelRepository.create(person)).toBe("4");
    const value = insert.values.mock.calls[0][0];
    expect(value).not.toHaveProperty("phone");
    expect(decryptSensitive(value.sensitiveInfo).phone).toBe(person.phone);
  });
  it("更新先锁定目标，目标不存在不写入", async () => {
    const valid = fakeDb([{ id: 1 }]);
    await personnelRepository.update(1, person);
    expect(valid.query.for).toHaveBeenCalledWith("update");
    expect(valid.update.set).toHaveBeenCalledOnce();
    const missing = fakeDb();
    await expect(personnelRepository.update(1, person)).rejects.toMatchObject({ status: 404 });
    expect(missing.update.set).not.toHaveBeenCalled();
  });
  it("删除全部ID存在才执行，并传播外键失败给事务", async () => {
    const valid = fakeDb([{ id: 1 }]);
    await personnelRepository.remove([1]);
    expect(valid.db.transaction).toHaveBeenCalledOnce();
    expect(valid.remove.where).toHaveBeenCalledOnce();
    const missing = fakeDb([{ id: 1 }]);
    await expect(personnelRepository.remove([1,2])).rejects.toMatchObject({ status: 409 });
    expect(missing.remove.where).not.toHaveBeenCalled();
    const blocked = fakeDb([{ id: 1 }]);
    blocked.remove.where.mockRejectedValue({ code: "ER_ROW_IS_REFERENCED_2" });
    await expect(personnelRepository.remove([1])).rejects.toMatchObject({ code: "ER_ROW_IS_REFERENCED_2" });
  });
  it("导入数据库重名时提供原始行号，不执行插入", async () => {
    const { insert } = fakeDb([{ name: person.name }]);
    await expect(personnelRepository.importPeople([{ row: 9, person }])).rejects.toMatchObject({ status: 409, issues: [{ row: 9, field: "姓名", message: "姓名已存在" }] });
    expect(insert.values).not.toHaveBeenCalled();
  });
  it("导入分块共用同一事务，并发唯一冲突向外传播", async () => {
    const valid = fakeDb();
    await personnelRepository.importPeople(Array.from({ length: 101 }, (_, index) => ({ row: index + 4, person: { ...person, name: `测试${index}` } })));
    expect(valid.db.transaction).toHaveBeenCalledOnce();
    expect(valid.insert.values.mock.calls.map(call => call[0].length)).toEqual([100,1]);
    const raced = fakeDb();
    raced.insert.values.mockRejectedValue({ code: "ER_DUP_ENTRY" });
    await expect(personnelRepository.importPeople([{ row: 4, person }])).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });
  });
});

// 真实事务验证仅使用显式测试配置，绝不加载开发库配置。
import { mysqlAvailable, openFixture } from "@/tests/database-fixtures";
describe.skipIf(!mysqlAvailable)("人员仓储真实MySQL事务", () => {
  it("实际密文持久化、更新、关联删除回滚及导入整批拒绝", async () => {
    const fixture = await openFixture();
    state.db = fixture.db as ReturnType<typeof getDb>;
    try {
      const first = await personnelRepository.create(person);
      const second = await personnelRepository.create({ ...person, name: "第二人员" });
      await personnelRepository.update(Number(first), { ...person, phone: "001" });
      expect((await personnelRepository.list())[0].phone).toBe("001");
      await fixture.connection.query("INSERT INTO payroll_sheets(name) VALUES ('测试工资单')");
      await fixture.connection.query("INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (1,?,100)", [first]);
      await expect(personnelRepository.remove([Number(second), Number(first)])).rejects.toThrow();
      expect(await personnelRepository.list()).toHaveLength(2);
      await expect(personnelRepository.importPeople([{ row: 4, person: { ...person, name: "全新人员" } }, { row: 5, person }])).rejects.toThrow();
      expect(await personnelRepository.list()).toHaveLength(2);
      await personnelRepository.remove([Number(second)]);
      expect(await personnelRepository.list()).toHaveLength(1);
    } finally { await fixture.connection.end(); }
  });
});
