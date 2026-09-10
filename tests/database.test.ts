import { afterEach, describe, expect, it, vi } from "vitest";
import mysql from "mysql2/promise";
import { readDbConfig } from "../db/config";
import { createDbClient, checkDatabase } from "../db/client";
const env = { NODE_ENV: "test", DB_HOST: "127.0.0.1", DB_PORT: "3306", DB_NAME: "payroll_test_config", DB_USER: "test", DB_PASSWORD: "fixture-only" };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe("数据库配置", () => {
  it("读取默认配置且保留密码中的空格", () => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    expect(readDbConfig().connectionLimit).toBe(5);
    expect(readDbConfig({ ...env, DB_PASSWORD: " secret " }).password).toBe(" secret ");
  });
  it.each(["DB_HOST","DB_PORT","DB_NAME","DB_USER","DB_PASSWORD"])("拒绝缺失配置 %s", key => {
    for (const value of [undefined, "", " ", "\0"]) expect(() => readDbConfig({ ...env, [key]: value })).toThrow();
  });
  it.each(["", "0", "65536", "1.5", "abc"])("拒绝无效端口 %s", DB_PORT => {
    expect(() => readDbConfig({ ...env, DB_PORT })).toThrow();
  });
  it("拒绝无效环境、主机、库名和非隔离测试库", () => {
    for (const patch of [{ NODE_ENV: undefined }, { DB_HOST: "host:3306" }, { DB_NAME: "a-b" }, { DB_NAME: "production" }]) {
      expect(() => readDbConfig({ ...env, ...patch })).toThrow();
    }
    expect(readDbConfig({ ...env, NODE_ENV: "production", DB_NAME: "payroll" }).database).toBe("payroll");
  });
});
describe("连接池与健康查询", () => {
  it("连接池工厂使用默认配置，不立即执行查询", async () => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const client = createDbClient();
    expect(client.connection).toBeDefined();
    await client.connection.end();
  });
  it.each(["development","production"])("%s 复用连接池", async NODE_ENV => {
    vi.resetModules();
    for (const [key,value] of Object.entries({ ...env, NODE_ENV })) vi.stubEnv(key,value);
    const clientModule = await import("../db/client");
    const client = clientModule.getDbClient();
    expect(clientModule.getDbClient()).toBe(client);
    if (NODE_ENV === "development") {
      vi.resetModules();
      expect((await import("../db/client")).getDbClient()).toBe(client);
    }
    await client.connection.end();
  });
  it("健康检查成功和失败均释放连接", async () => {
    const connection = { query: vi.fn().mockResolvedValue([]), release: vi.fn(), destroy: vi.fn() };
    const cache = globalThis as typeof globalThis & { payrollMysql?: unknown };
    const before = cache.payrollMysql;
    cache.payrollMysql = { connection: { getConnection: vi.fn().mockResolvedValue(connection) } };
    try {
      await checkDatabase();
      expect(connection.release).toHaveBeenCalledOnce();
      connection.query.mockRejectedValue(new Error("敏感内容"));
      await expect(checkDatabase()).rejects.toThrow();
      expect(connection.release).toHaveBeenCalledTimes(2);
    } finally { cache.payrollMysql = before; }
  });
  it.each([true,false])("超时销毁已获取连接或释放迟到连接：%s", async acquired => {
    vi.useFakeTimers();
    let resolveConnection!: (connection: unknown) => void;
    const connection = { query: vi.fn(() => new Promise(() => {})), release: vi.fn(), destroy: vi.fn() };
    const cache = globalThis as typeof globalThis & { payrollMysql?: unknown };
    const before = cache.payrollMysql;
    cache.payrollMysql = { connection: { getConnection: () => acquired ? Promise.resolve(connection) : new Promise(resolve => { resolveConnection = resolve; }) } };
    try {
      const result = expect(checkDatabase(10)).rejects.toThrow("数据库检查超时");
      await vi.advanceTimersByTimeAsync(11);
      await result;
      if (acquired) expect(connection.destroy).toHaveBeenCalledOnce();
      else { resolveConnection(connection); await Promise.resolve(); expect(connection.release).toHaveBeenCalledOnce(); }
    } finally { cache.payrollMysql = before; }
  });
  it("连接池使用有限队列", async () => {
    const spy = vi.spyOn(mysql, "createPool");
    const client = createDbClient(readDbConfig(env));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queueLimit: 10, connectionLimit: 5 }));
    await client.connection.end();
  });
});