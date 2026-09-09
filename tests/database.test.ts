import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readDbConfig } from "../db/config";
import { createDbClient } from "../db/client";

const directory = mkdtempSync(join(tmpdir(), "payroll-sqlite-test-"));
const clients: ReturnType<typeof createDbClient>[] = [];
function open(name: string) {
  const client = createDbClient({ filename: join(directory, name + ".sqlite") });
  clients.push(client);
  return client;
}
afterEach(() => {
  for (const client of clients) if (client.connection.open) client.connection.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("数据库路径隔离", () => {
  it("开发环境固定使用临时目录，忽略生产路径", () => {
    expect(readDbConfig({ NODE_ENV: "development", DB_FILE: "/data/payroll.sqlite" }).filename)
      .toBe(join(tmpdir(), "payroll", "payroll.sqlite"));
  });
  it.each([undefined, "", "relative.sqlite", ":memory:", join(directory, "wrong.db"), "\0invalid"])("拒绝无效生产路径 %s", (filename) => {
    expect(() => readDbConfig({ NODE_ENV: "production", DB_FILE: filename })).toThrow(/DB_FILE|扩展名/);
  });
  it("生产路径保留空格与中文", () => {
    const filename = join(directory, "工资 数据.sqlite");
    expect(readDbConfig({ NODE_ENV: "production", DB_FILE: filename }).filename).toBe(filename);
  });
  it.each([undefined, "", "staging"])("拒绝未知环境 %s", (environment) => {
    expect(() => readDbConfig({ NODE_ENV: environment })).toThrow(/运行环境/);
  });
  it("默认读取进程配置", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DB_FILE", join(directory, "default.sqlite"));
    expect(readDbConfig().filename).toBe(join(directory, "default.sqlite"));
  });
});

describe("真实 SQLite 文件与事务", () => {
  it("开启 WAL、外键、同步持久化和锁等待", () => {
    const { connection } = open("settings");
    expect(connection.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(connection.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(connection.pragma("synchronous", { simple: true })).toBe(2);
    expect(connection.pragma("busy_timeout", { simple: true })).toBe(5000);
  });
  it("批量写入可回滚，成功数据在关闭重开后保留", () => {
    const { connection } = open("transaction");
    connection.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, amount INTEGER NOT NULL)");
    const insert = connection.prepare("INSERT INTO items VALUES (?, ?)");
    expect(() => connection.transaction(() => {
      insert.run(1, 100);
      insert.run(1, 200);
    })()).toThrow();
    expect(connection.prepare("SELECT count(*) AS count FROM items").get()).toEqual({ count: 0 });
    connection.transaction(() => { for (let i = 0; i < 1000; i++) insert.run(i, i * 100); })();
    connection.close();
    expect(open("transaction").connection.prepare("SELECT count(*) AS count FROM items").get()).toEqual({ count: 1000 });
  });
  it("外键阻止无效关联", () => {
    const { connection } = open("foreign-keys");
    connection.exec("CREATE TABLE parents(id INTEGER PRIMARY KEY); CREATE TABLE children(parent_id INTEGER REFERENCES parents(id))");
    expect(() => connection.prepare("INSERT INTO children VALUES (?)").run(999)).toThrow();
  });
  it("初始化失败会关闭已打开连接", () => {
    const close = vi.spyOn(Database.prototype, "close");
    vi.spyOn(Database.prototype, "pragma").mockImplementationOnce(() => { throw new Error("测试初始化失败"); });
    expect(() => open("failure")).toThrow("测试初始化失败");
    expect(close).toHaveBeenCalledOnce();
  });
  it.each(["development", "production"])("%s 环境延迟创建并复用连接", async (environment) => {
    vi.resetModules();
    // 以测试路径打开真实连接，再切换 NODE_ENV 验证对应缓存分支。
    const config = await import("../db/config");
    vi.spyOn(config, "readDbConfig").mockReturnValue({ filename: join(directory, environment + ".sqlite") });
    vi.stubEnv("NODE_ENV", environment);
    const clientModule = await import("../db/client");
    const first = clientModule.getDbClient();
    clients.push(first);
    expect(clientModule.getDbClient()).toBe(first);
    if (environment === "development") {
      vi.resetModules();
      expect((await import("../db/client")).getDbClient()).toBe(first);
    }
  });
  it("使用默认环境配置创建连接", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DB_FILE", join(directory, "default-client.sqlite"));
    const client = createDbClient();
    clients.push(client);
    expect(client.connection.open).toBe(true);
  });
});

