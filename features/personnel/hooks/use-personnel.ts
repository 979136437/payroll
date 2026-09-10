"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Person } from "../model/personnel";

export class ApiError extends Error {
  constructor(message: string, public issues?: { row: number; field: string; message: string }[]) { super(message); }
}
export async function checkResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "请求失败，请稍后重试" }));
    throw new ApiError(error.message ?? "请求失败，请稍后重试", error.issues);
  }
  return response;
}
async function jsonRequest(url: string, init?: RequestInit) {
  try { return await (await checkResponse(await fetch(url, { ...init, cache: "no-store" }))).json(); }
  catch (error) {
    if (error instanceof ApiError || init?.signal?.aborted) throw error;
    throw new ApiError("网络连接失败，请稍后重试");
  }
}
export function usePersonnel(query: string, page: number, pageSize: number) {
  return useQuery<{ items: Person[]; page: number; pages: number; total: number; totalPeople: number }>({
    queryKey: ["personnel", query, page, pageSize],
    queryFn: ({ signal }) => jsonRequest(`/api/personnel?${new URLSearchParams({ query, page: String(page), pageSize: String(pageSize) })}`, { signal }),
    retry: false,
  });
}
export function useSavePerson() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Person) => jsonRequest(id ? `/api/personnel/${id}` : "/api/personnel", {
      method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["personnel"] }),
  });
}
export function useDeletePeople() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => jsonRequest("/api/personnel", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["personnel"] }),
  });
}
