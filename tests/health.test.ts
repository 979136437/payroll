import { expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { GET } from "../app/api/health/route";

vi.mock("@/db", () => ({ getDb: vi.fn() }));

it("健康检查成功时返回 200", async () => {
  const get = vi.fn();
  vi.mocked(getDb).mockReturnValue({ get } as unknown as ReturnType<typeof getDb>);
  const response = GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "正常" });
  expect(get).toHaveBeenCalledOnce();
});

it("数据库不可用时返回 503 且不暴露内部路径", async () => {
  vi.mocked(getDb).mockImplementation(() => { throw new Error("内部数据库路径"); });
  const response = GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "数据库不可用" });
});
