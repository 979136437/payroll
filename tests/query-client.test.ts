import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { environmentManager, useQueryClient } from "@tanstack/react-query";
import Providers from "../app/providers";
import { createQueryClient, getQueryClient } from "../lib/query-client";

afterEach(() => vi.restoreAllMocks());

it("服务端各请求的缓存相互隔离", () => {
  vi.spyOn(environmentManager, "isServer").mockReturnValue(true);
  const first = getQueryClient();
  first.setQueryData(["工资"], 100);
  const second = getQueryClient();
  expect(second).not.toBe(first);
  expect(second.getQueryData(["工资"])).toBeUndefined();
  first.clear();
  second.clear();
});

it("浏览器重复获取客户端时保留同一份缓存", () => {
  vi.spyOn(environmentManager, "isServer").mockReturnValue(false);
  const client = getQueryClient();
  client.setQueryData(["工资"], 100);
  expect(getQueryClient()).toBe(client);
  expect(getQueryClient().getQueryData(["工资"])).toBe(100);
  client.clear();
});

it("新鲜期内复用查询结果，失效后重新查询", async () => {
  const client = createQueryClient();
  const queryFn = vi.fn().mockResolvedValue(100);
  const options = { queryKey: ["工资"], queryFn };
  await client.fetchQuery(options);
  await client.fetchQuery(options);
  expect(queryFn).toHaveBeenCalledTimes(1);
  await client.invalidateQueries({ queryKey: options.queryKey });
  await client.fetchQuery(options);
  expect(queryFn).toHaveBeenCalledTimes(2);
  client.clear();
});

it("写入失败时不会自动重复执行", async () => {
  const client = createQueryClient();
  const mutationFn = vi.fn().mockRejectedValue(new Error("写入失败"));
  const mutation = client.getMutationCache().build(client, { mutationFn });
  await expect(mutation.execute(undefined)).rejects.toThrow("写入失败");
  expect(mutationFn).toHaveBeenCalledTimes(1);
  client.clear();
});

it("Provider 向后代提供可用的查询客户端", () => {
  function Consumer() {
    const client = useQueryClient();
    return createElement("span", null, client ? "已就绪" : "未初始化");
  }
  expect(renderToString(createElement(Providers, null, createElement(Consumer))))
    .toContain("已就绪");
});
