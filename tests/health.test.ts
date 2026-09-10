import { expect, it, vi } from "vitest";
import { checkDatabase } from "../db/client";
import { GET } from "../app/api/health/route";
vi.mock("../db/client", () => ({ checkDatabase: vi.fn() }));
it("健康检查成功返回 200", async () => {
  vi.mocked(checkDatabase).mockResolvedValue();
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "正常" });
});
it.each(["内部密码", "数据库检查超时"])("健康检查失败返回 503 并脱敏：%s", async message => {
  vi.mocked(checkDatabase).mockRejectedValue(new Error(message));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "数据库不可用" });
});