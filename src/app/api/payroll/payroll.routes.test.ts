import { GET as exportPayrollSheetGet } from "@/app/api/payroll/[id]/export/route";
import {
  DELETE as deletePayrollSheetById,
  GET as getPayrollSheetByIdRoute,
} from "@/app/api/payroll/[id]/route";
import {
  DELETE as removePayrollPersonnelRoute,
  POST as addPayrollPersonnelRoute,
} from "@/app/api/payroll/[id]/personnel/route";
import {
  PUT as updateExportWeightRoute,
} from "@/app/api/payroll/record/[id]/export-weight/route";
import {
  PUT as updateNetPayRoute,
} from "@/app/api/payroll/record/[id]/net-pay/route";
import { GET as listPayrollSheetsGet, POST as createPayrollSheetPost } from "@/app/api/payroll/route";
import { exportPayrollSheetExcel } from "@/lib/services/excel.service";
import {
  addPersonnelToSheet,
  createPayrollSheet,
  deletePayrollSheet,
  getPayrollSheetDetail,
  listPayrollSheets,
  removePersonnelFromSheet,
  updatePayrollRecordExportWeight,
  updatePayrollRecordNetPay,
} from "@/lib/services/payroll.service";

vi.mock("@/lib/services/payroll.service", () => ({
  addPersonnelToSheet: vi.fn(),
  createPayrollSheet: vi.fn(),
  deletePayrollSheet: vi.fn(),
  getPayrollSheetDetail: vi.fn(),
  listPayrollSheets: vi.fn(),
  removePersonnelFromSheet: vi.fn(),
  updatePayrollRecordExportWeight: vi.fn(),
  updatePayrollRecordNetPay: vi.fn(),
}));

vi.mock("@/lib/services/excel.service", () => ({
  exportPayrollSheetExcel: vi.fn(),
}));

function createJsonRequest(url: string, body?: unknown, method = "POST") {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("payroll routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("GET /api/payroll returns list", async () => {
    vi.mocked(listPayrollSheets).mockResolvedValue([{ id: 1, name: "六月" } as any]);

    const response = await listPayrollSheetsGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, name: "六月" }]);
  });

  test("GET /api/payroll handles service error", async () => {
    vi.mocked(listPayrollSheets).mockRejectedValue(new Error("列表失败"));

    const response = await listPayrollSheetsGet();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "获取工资表列表失败" });
  });

  test("GET /api/payroll falls back to default error message", async () => {
    vi.mocked(listPayrollSheets).mockRejectedValue({});

    const response = await listPayrollSheetsGet();

    expect(await response.json()).toEqual({ error: "获取工资表列表失败" });
  });

  test("POST /api/payroll returns created sheet or 400", async () => {
    vi.mocked(createPayrollSheet).mockResolvedValue({ id: 1, name: "六月" } as any);

    const success = await createPayrollSheetPost(
      createJsonRequest("http://localhost/api/payroll", { name: "六月" })
    );

    expect(success.status).toBe(200);
    expect(createPayrollSheet).toHaveBeenCalledWith({
      name: "六月",
      sourceSheetId: null,
    });

    vi.mocked(createPayrollSheet).mockRejectedValueOnce(new Error("工资表名称不能为空"));
    const failure = await createPayrollSheetPost(
      createJsonRequest("http://localhost/api/payroll", { name: "" })
    );

    expect(failure.status).toBe(400);
    expect(await failure.json()).toEqual({ error: "工资表名称不能为空" });
  });

  test("POST /api/payroll rejects malformed JSON", async () => {
    const response = await createPayrollSheetPost(
      new Request("http://localhost/api/payroll", {
        method: "POST",
        body: "{",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "请求体 JSON 无效" });
    expect(createPayrollSheet).not.toHaveBeenCalled();
  });

  test("POST /api/payroll maps a missing source sheet to 404", async () => {
    vi.mocked(createPayrollSheet).mockRejectedValue(
      new Error("来源工资表不存在")
    );

    const response = await createPayrollSheetPost(
      createJsonRequest("http://localhost/api/payroll", {
        name: "目标表",
        sourceSheetId: 999,
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "来源工资表不存在" });
  });

  test("POST /api/payroll falls back to default create error message", async () => {
    vi.mocked(createPayrollSheet).mockRejectedValue({});

    const response = await createPayrollSheetPost(
      createJsonRequest("http://localhost/api/payroll", { name: "" })
    );

    expect(await response.json()).toEqual({ error: "创建工资表失败" });
  });

  test("GET /api/payroll/[id] returns detail or 404", async () => {
    vi.mocked(getPayrollSheetDetail)
      .mockResolvedValueOnce({ sheet: { id: 1 }, records: [] } as any)
      .mockResolvedValueOnce(null);

    const success = await getPayrollSheetByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    const missing = await getPayrollSheetByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(success.status).toBe(200);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "工资表不存在" });
  });

  test("GET /api/payroll/[id] handles service exception", async () => {
    vi.mocked(getPayrollSheetDetail).mockRejectedValue(new Error("详情失败"));

    const response = await getPayrollSheetByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "获取工资表详情失败" });
  });

  test("GET /api/payroll/[id] uses fallback detail error", async () => {
    vi.mocked(getPayrollSheetDetail).mockRejectedValue({});

    const response = await getPayrollSheetByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(await response.json()).toEqual({ error: "获取工资表详情失败" });
  });

  test("DELETE /api/payroll/[id] returns deleted flag or 404", async () => {
    vi.mocked(deletePayrollSheet)
      .mockResolvedValueOnce({ deleted: true })
      .mockResolvedValueOnce({ deleted: false });

    const success = await deletePayrollSheetById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    const missing = await deletePayrollSheetById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({ deleted: true });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "工资表不存在" });
  });

  test("DELETE /api/payroll/[id] handles service exception", async () => {
    vi.mocked(deletePayrollSheet).mockRejectedValue(new Error("删除失败"));

    const response = await deletePayrollSheetById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "删除工资表失败" });
  });

  test("DELETE /api/payroll/[id] uses fallback delete error", async () => {
    vi.mocked(deletePayrollSheet).mockRejectedValue({});

    const response = await deletePayrollSheetById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(await response.json()).toEqual({ error: "删除工资表失败" });
  });

  test("POST /api/payroll/[id]/personnel validates array and forwards options", async () => {
    const invalid = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: "bad",
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: "personnelIds 必须是正整数数组",
    });

    const empty = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [],
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "personnelIds 不能为空" });

    const invalidPay = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1],
        defaultNetPay: "99",
      }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(invalidPay.status).toBe(400);
    expect(await invalidPay.json()).toEqual({
      error: "defaultNetPay 必须是有效数字",
    });

    const success = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1, 2],
        defaultNetPay: 99,
        perPersonNetPay: { 2: 101 },
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(success.status).toBe(200);
    expect(addPersonnelToSheet).toHaveBeenCalledWith(1, [1, 2], {
      defaultNetPay: 99,
      perPersonNetPay: { 2: 101 },
    });
  });

  test("POST /api/payroll/[id]/personnel handles service exception", async () => {
    vi.mocked(addPersonnelToSheet).mockRejectedValue(new Error("添加人员失败"));

    const response = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1, 2],
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "添加人员失败" });
  });

  test("POST /api/payroll/[id]/personnel uses fallback error", async () => {
    vi.mocked(addPersonnelToSheet).mockRejectedValue({});

    const response = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1],
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(await response.json()).toEqual({ error: "添加人员失败" });
  });

  test("POST /api/payroll/[id]/personnel maps missing sheets to 404", async () => {
    vi.mocked(addPersonnelToSheet).mockRejectedValue(new Error("工资表不存在"));

    const response = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1],
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "工资表不存在" });
  });

  test("POST /api/payroll/[id]/personnel maps missing personnel to 404", async () => {
    vi.mocked(addPersonnelToSheet).mockRejectedValue(
      new Error("部分人员不存在")
    );

    const response = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [999],
      }),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "部分人员不存在" });
  });

  test("DELETE /api/payroll/[id]/personnel validates array", async () => {
    const invalid = await removePayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: "bad",
      }, "DELETE"),
      { params: Promise.resolve({ id: "1" }) }
    );
    const empty = await removePayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [],
      }, "DELETE"),
      { params: Promise.resolve({ id: "1" }) }
    );
    const success = await removePayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1, 2],
      }, "DELETE"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(invalid.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "personnelIds 不能为空" });
    expect(success.status).toBe(200);
    expect(removePersonnelFromSheet).toHaveBeenCalledWith(1, [1, 2]);
  });

  test("DELETE /api/payroll/[id]/personnel handles service exception", async () => {
    vi.mocked(removePersonnelFromSheet).mockRejectedValue(new Error("移除工员失败"));

    const response = await removePayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1, 2],
      }, "DELETE"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "移除工员失败" });
  });

  test("DELETE /api/payroll/[id]/personnel uses fallback error", async () => {
    vi.mocked(removePersonnelFromSheet).mockRejectedValue({});

    const response = await removePayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1],
      }, "DELETE"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(await response.json()).toEqual({ error: "移除工员失败" });
  });

  test("DELETE /api/payroll/[id]/personnel maps missing sheets to 404", async () => {
    vi.mocked(removePersonnelFromSheet).mockRejectedValue(
      new Error("工资表不存在")
    );

    const response = await removePayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", {
        personnelIds: [1],
      }, "DELETE"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "工资表不存在" });
  });

  test("payroll mutation routes reject null JSON bodies", async () => {
    const context = { params: Promise.resolve({ id: "1" }) };
    const addResponse = await addPayrollPersonnelRoute(
      createJsonRequest("http://localhost/api/payroll/1/personnel", null),
      context
    );
    const removeResponse = await removePayrollPersonnelRoute(
      createJsonRequest(
        "http://localhost/api/payroll/1/personnel",
        null,
        "DELETE"
      ),
      context
    );
    const netPayResponse = await updateNetPayRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/net-pay",
        null,
        "PUT"
      ),
      context
    );
    const exportWeightResponse = await updateExportWeightRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/export-weight",
        null,
        "PUT"
      ),
      context
    );

    expect(addResponse.status).toBe(400);
    expect(removeResponse.status).toBe(400);
    expect(netPayResponse.status).toBe(400);
    expect(exportWeightResponse.status).toBe(400);
    expect(addPersonnelToSheet).not.toHaveBeenCalled();
    expect(removePersonnelFromSheet).not.toHaveBeenCalled();
    expect(updatePayrollRecordNetPay).not.toHaveBeenCalled();
    expect(updatePayrollRecordExportWeight).not.toHaveBeenCalled();
  });

  test("PUT /api/payroll/record/[id]/net-pay validates netPay and handles 404", async () => {
    const invalid = await updateNetPayRoute(
      createJsonRequest("http://localhost/api/payroll/record/1/net-pay", {}, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "netPay 必须是有效数字" });

    const wrongType = await updateNetPayRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/net-pay",
        { netPay: "100" },
        "PUT"
      ),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(wrongType.status).toBe(400);

    vi.mocked(updatePayrollRecordNetPay).mockResolvedValueOnce(null);
    const missing = await updateNetPayRoute(
      createJsonRequest("http://localhost/api/payroll/record/1/net-pay", { netPay: 100 }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "工资记录不存在" });
  });

  test("PUT /api/payroll/record/[id]/net-pay handles service exception", async () => {
    vi.mocked(updatePayrollRecordNetPay).mockRejectedValue(new Error("更新净工资失败"));

    const response = await updateNetPayRoute(
      createJsonRequest("http://localhost/api/payroll/record/1/net-pay", { netPay: 100 }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "更新净工资失败" });
  });

  test("PUT /api/payroll/record/[id]/net-pay uses fallback error", async () => {
    vi.mocked(updatePayrollRecordNetPay).mockRejectedValue({});

    const response = await updateNetPayRoute(
      createJsonRequest("http://localhost/api/payroll/record/1/net-pay", { netPay: 100 }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(await response.json()).toEqual({ error: "更新净工资失败" });
  });

  test("PUT /api/payroll/record/[id]/export-weight handles nullable input", async () => {
    vi.mocked(updatePayrollRecordExportWeight).mockResolvedValue({ recordId: 1 } as any);

    const success = await updateExportWeightRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/export-weight",
        { exportWeight: 3 },
        "PUT"
      ),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(success.status).toBe(200);
    expect(updatePayrollRecordExportWeight).toHaveBeenCalledWith(1, 3);
  });

  test("PUT /api/payroll/record/[id]/export-weight rejects invalid input", async () => {
    const response = await updateExportWeightRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/export-weight",
        { exportWeight: "3" },
        "PUT"
      ),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "exportWeight 必须是非负整数或 null",
    });
  });

  test("PUT /api/payroll/record/[id]/export-weight returns 404 and 500", async () => {
    vi.mocked(updatePayrollRecordExportWeight)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("更新导出权重失败"));

    const missing = await updateExportWeightRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/export-weight",
        { exportWeight: null },
        "PUT"
      ),
      { params: Promise.resolve({ id: "1" }) }
    );
    const failure = await updateExportWeightRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/export-weight",
        { exportWeight: null },
        "PUT"
      ),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "工资记录不存在" });
    expect(failure.status).toBe(500);
    expect(await failure.json()).toEqual({ error: "更新导出权重失败" });
  });

  test("PUT /api/payroll/record/[id]/export-weight uses fallback error", async () => {
    vi.mocked(updatePayrollRecordExportWeight).mockRejectedValue({});

    const response = await updateExportWeightRoute(
      createJsonRequest(
        "http://localhost/api/payroll/record/1/export-weight",
        { exportWeight: null },
        "PUT"
      ),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(await response.json()).toEqual({ error: "更新导出权重失败" });
  });

  test("GET /api/payroll/[id]/export returns excel attachment", async () => {
    vi.mocked(exportPayrollSheetExcel).mockResolvedValue(Buffer.from("excel"));

    const response = await exportPayrollSheetGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  test("GET /api/payroll/[id]/export handles service exception", async () => {
    vi.mocked(exportPayrollSheetExcel).mockRejectedValue(new Error("导出失败"));

    const response = await exportPayrollSheetGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "导出失败" });
  });

  test("GET /api/payroll/[id]/export uses fallback error", async () => {
    vi.mocked(exportPayrollSheetExcel).mockRejectedValue({});

    const response = await exportPayrollSheetGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(await response.json()).toEqual({ error: "导出失败" });
  });
});
