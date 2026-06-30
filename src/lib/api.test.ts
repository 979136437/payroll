import { payrollApi, personnelApi } from "@/lib/api";

describe("lib/api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("request returns parsed json on success", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
    );

    await expect(personnelApi.list()).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/personnel", expect.any(Object));
  });

  test("request prefers json error message", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "失败" }), { status: 400 })
    );

    await expect(payrollApi.get(1)).rejects.toThrow("失败");
  });

  test("request falls back to status error", async () => {
    fetchMock.mockResolvedValue(
      new Response("oops", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(personnelApi.get(1)).rejects.toThrow("请求失败: 500");
  });

  test("personnel import sends FormData and falls back to import error", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ createdCount: 1, updatedCount: 0, skippedCount: 0, errors: [] }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response("bad", { status: 500 }));

    const file = new File(["demo"], "roster.xlsx");
    const result = await personnelApi.importExcel(file);

    expect(result.createdCount).toBe(1);
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestOptions.body).toBeInstanceOf(FormData);

    await expect(personnelApi.importExcel(file)).rejects.toThrow("导入失败");
  });

  test("personnel api mutation helpers send expected payloads", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    );

    await personnelApi.create({ name: "张三" });
    await personnelApi.update(1, { name: "李四" });
    await personnelApi.delete(1);
    await personnelApi.batchDelete([1, 2]);
    await personnelApi.reorder([2, 1]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/personnel",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "张三" }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/personnel/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "李四" }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/personnel/1",
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/personnel/batch-delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [1, 2] }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/personnel/reorder",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ orderedIds: [2, 1] }),
      })
    );
  });

  test("payroll api helpers send expected payloads", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    );

    await payrollApi.list();
    await payrollApi.create({ name: "六月工资", sourceSheetId: 1 });
    await payrollApi.get(1);
    await payrollApi.delete(1);
    await payrollApi.addPersonnel(1, [1, 2], {
      defaultNetPay: 200,
      perPersonNetPay: { 2: 250 },
    });
    await payrollApi.removePersonnel(1, [1, 2]);
    await payrollApi.updateNetPay(9, 123.45);
    await payrollApi.updateExportWeight(9, 2);
    await payrollApi.updateExportWeight(9, null);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/payroll", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/payroll",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "六月工资", sourceSheetId: 1 }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/payroll/1", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/payroll/1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/payroll/1/personnel",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          personnelIds: [1, 2],
          defaultNetPay: 200,
          perPersonNetPay: { 2: 250 },
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/payroll/1/personnel",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ personnelIds: [1, 2] }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/payroll/record/9/net-pay",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ netPay: 123.45 }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "/api/payroll/record/9/export-weight",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ exportWeight: 2 }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "/api/payroll/record/9/export-weight",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ exportWeight: null }),
      })
    );
  });

  test("export helpers return route urls", () => {
    expect(personnelApi.exportExcel()).toBe("/api/personnel/export");
    expect(payrollApi.exportExcel(3)).toBe("/api/payroll/3/export");
  });
});
