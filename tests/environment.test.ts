import { afterEach, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { loadDatabaseEnvironment } from "../scripts/environment";

vi.mock("node:fs", () => ({ existsSync: vi.fn(() => false), readFileSync: vi.fn() }));
vi.mock("@next/env", () => ({ loadEnvConfig: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

it.each([undefined, "", "test", "prod"])("拒绝不明确环境 %s", (environment) => {
  expect(() => loadDatabaseEnvironment(environment)).toThrow(/必须明确指定/);
  expect(loadEnvConfig).not.toHaveBeenCalled();
});
it.each(["development", "production"])("明确加载 %s 配置", (environment) => {
  vi.stubEnv("NODE_ENV", "test");
  loadDatabaseEnvironment(environment);
  expect(process.env.NODE_ENV).toBe(environment);
  expect(loadEnvConfig).toHaveBeenCalledWith(process.cwd(), environment === "development", expect.any(Object), true);
  const logger = vi.mocked(loadEnvConfig).mock.calls[0][2]!;
  expect(logger.info("敏感配置")).toBeUndefined();
  expect(logger.error("敏感配置")).toBeUndefined();
});
it("拒绝通用文件中的数据库变量", () => {
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue("export DB_PASSWORD=不能显示的密码");
  expect(() => loadDatabaseEnvironment("production")).toThrow("请将数据库配置移至对应环境文件，不能使用通用环境文件");
});
it("允许通用文件中的其他变量", () => {
  vi.mocked(existsSync).mockReturnValue(true);
  vi.mocked(readFileSync).mockReturnValue("OTHER=value");
  expect(() => loadDatabaseEnvironment("development")).not.toThrow();
});
