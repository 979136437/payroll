import { GET as exportPersonnelGet } from "@/app/api/personnel/export/route";
import { POST as importPersonnelPost } from "@/app/api/personnel/import/route";
import { GET as listPersonnelGet, POST as createPersonnelPost } from "@/app/api/personnel/route";
import { POST as reorderPersonnelPost } from "@/app/api/personnel/reorder/route";
import { POST as batchDeletePersonnelPost } from "@/app/api/personnel/batch-delete/route";
import {
  DELETE as deletePersonnelById,
  GET as getPersonnelByIdRoute,
  PUT as updatePersonnelById,
} from "@/app/api/personnel/[id]/route";
import { exportPersonnelExcel, importPersonnelFromExcel } from "@/lib/services/excel.service";
import {
  createPersonnel,
  deletePersonnel,
  deletePersonnelBatch,
  getPersonnelById,
  listPersonnel,
  reorderPersonnel,
  updatePersonnel,
} from "@/lib/services/personnel.service";

vi.mock("@/lib/services/personnel.service", () => ({
  createPersonnel: vi.fn(),
  deletePersonnel: vi.fn(),
  deletePersonnelBatch: vi.fn(),
  getPersonnelById: vi.fn(),
  listPersonnel: vi.fn(),
  reorderPersonnel: vi.fn(),
  updatePersonnel: vi.fn(),
}));

vi.mock("@/lib/services/excel.service", () => ({
  exportPersonnelExcel: vi.fn(),
  importPersonnelFromExcel: vi.fn(),
}));

function createJsonRequest(url: string, body?: unknown, method = "POST") {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("personnel routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("GET /api/personnel returns list", async () => {
    vi.mocked(listPersonnel).mockResolvedValue([{ id: 1, name: "张三" } as any]);

    const response = await listPersonnelGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, name: "张三" }]);
  });

  test("GET /api/personnel handles service error", async () => {
    vi.mocked(listPersonnel).mockRejectedValue(new Error("boom"));

    const response = await listPersonnelGet();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "boom" });
  });

  test("GET /api/personnel falls back to default error message", async () => {
    vi.mocked(listPersonnel).mockRejectedValue({});

    const response = await listPersonnelGet();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "获取人员列表失败" });
  });

  test("POST /api/personnel returns created item", async () => {
    vi.mocked(createPersonnel).mockResolvedValue({ id: 1, name: "张三" } as any);

    const response = await createPersonnelPost(
      createJsonRequest("http://localhost/api/personnel", { name: "张三" })
    );

    expect(response.status).toBe(200);
    expect(createPersonnel).toHaveBeenCalledWith({ name: "张三" });
  });

  test("POST /api/personnel returns 400 on validation failure", async () => {
    vi.mocked(createPersonnel).mockRejectedValue(new Error("姓名不能为空"));

    const response = await createPersonnelPost(
      createJsonRequest("http://localhost/api/personnel", { name: "" })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "姓名不能为空" });
  });

  test("POST /api/personnel falls back to default create message", async () => {
    vi.mocked(createPersonnel).mockRejectedValue({});

    const response = await createPersonnelPost(
      createJsonRequest("http://localhost/api/personnel", { name: "" })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "创建人员失败" });
  });

  test("GET /api/personnel/[id] returns 404 when missing", async () => {
    vi.mocked(getPersonnelById).mockResolvedValue(null);

    const response = await getPersonnelByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "人员不存在" });
  });

  test("PUT /api/personnel/[id] returns updated item", async () => {
    vi.mocked(updatePersonnel).mockResolvedValue({ id: 1, name: "李四" } as any);

    const response = await updatePersonnelById(
      createJsonRequest("http://localhost/api/personnel/1", { name: "李四" }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(200);
    expect(updatePersonnel).toHaveBeenCalledWith(1, { name: "李四" });
  });

  test("PUT /api/personnel/[id] returns 404 when missing", async () => {
    vi.mocked(updatePersonnel).mockResolvedValue(null);

    const response = await updatePersonnelById(
      createJsonRequest("http://localhost/api/personnel/1", { name: "李四" }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "人员不存在" });
  });

  test("DELETE /api/personnel/[id] returns success or 404", async () => {
    vi.mocked(deletePersonnel).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const success = await deletePersonnelById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    const missing = await deletePersonnelById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({ success: true });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "人员不存在" });
  });

  test("GET, PUT and DELETE /api/personnel/[id] handle service exceptions", async () => {
    vi.mocked(getPersonnelById).mockRejectedValueOnce(new Error("查询失败"));
    vi.mocked(updatePersonnel).mockRejectedValueOnce(new Error("更新失败"));
    vi.mocked(deletePersonnel).mockRejectedValueOnce(new Error("删除失败"));

    const getResponse = await getPersonnelByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    const putResponse = await updatePersonnelById(
      createJsonRequest("http://localhost/api/personnel/1", { name: "李四" }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );
    const deleteResponse = await deletePersonnelById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(getResponse.status).toBe(500);
    expect(await getResponse.json()).toEqual({ error: "查询失败" });
    expect(putResponse.status).toBe(400);
    expect(await putResponse.json()).toEqual({ error: "更新失败" });
    expect(deleteResponse.status).toBe(500);
    expect(await deleteResponse.json()).toEqual({ error: "删除失败" });
  });

  test("GET, PUT and DELETE /api/personnel/[id] use fallback messages without error.message", async () => {
    vi.mocked(getPersonnelById).mockRejectedValueOnce({});
    vi.mocked(updatePersonnel).mockRejectedValueOnce({});
    vi.mocked(deletePersonnel).mockRejectedValueOnce({});

    const getResponse = await getPersonnelByIdRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    const putResponse = await updatePersonnelById(
      createJsonRequest("http://localhost/api/personnel/1", { name: "李四" }, "PUT"),
      { params: Promise.resolve({ id: "1" }) }
    );
    const deleteResponse = await deletePersonnelById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(await getResponse.json()).toEqual({ error: "获取人员信息失败" });
    expect(await putResponse.json()).toEqual({ error: "更新人员失败" });
    expect(await deleteResponse.json()).toEqual({ error: "删除人员失败" });
  });

  test("POST /api/personnel/batch-delete validates ids", async () => {
    const invalid = await batchDeletePersonnelPost(
      createJsonRequest("http://localhost/api/personnel/batch-delete", {
        ids: "bad",
      })
    );

    vi.mocked(deletePersonnelBatch).mockResolvedValue({ deletedCount: 2 });
    const valid = await batchDeletePersonnelPost(
      createJsonRequest("http://localhost/api/personnel/batch-delete", {
        ids: [1, 2],
      })
    );

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "ids 必须是数组" });
    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ deletedCount: 2 });
  });

  test("POST /api/personnel/batch-delete handles service exception", async () => {
    vi.mocked(deletePersonnelBatch).mockRejectedValue(new Error("批量删除失败"));

    const response = await batchDeletePersonnelPost(
      createJsonRequest("http://localhost/api/personnel/batch-delete", {
        ids: [1, 2],
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "批量删除失败" });
  });

  test("POST /api/personnel/batch-delete uses fallback error message", async () => {
    vi.mocked(deletePersonnelBatch).mockRejectedValue({});

    const response = await batchDeletePersonnelPost(
      createJsonRequest("http://localhost/api/personnel/batch-delete", {
        ids: [1, 2],
      })
    );

    expect(await response.json()).toEqual({ error: "批量删除失败" });
  });

  test("POST /api/personnel/reorder validates ordered ids", async () => {
    const invalid = await reorderPersonnelPost(
      createJsonRequest("http://localhost/api/personnel/reorder", {
        orderedIds: "bad",
      })
    );

    const valid = await reorderPersonnelPost(
      createJsonRequest("http://localhost/api/personnel/reorder", {
        orderedIds: [3, 2, 1],
      })
    );

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "orderedIds 必须是数组" });
    expect(valid.status).toBe(200);
    expect(reorderPersonnel).toHaveBeenCalledWith([3, 2, 1]);
  });

  test("POST /api/personnel/reorder handles service exception", async () => {
    vi.mocked(reorderPersonnel).mockRejectedValue(new Error("排序失败"));

    const response = await reorderPersonnelPost(
      createJsonRequest("http://localhost/api/personnel/reorder", {
        orderedIds: [3, 2, 1],
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "排序失败" });
  });

  test("POST /api/personnel/reorder uses fallback error message", async () => {
    vi.mocked(reorderPersonnel).mockRejectedValue({});

    const response = await reorderPersonnelPost(
      createJsonRequest("http://localhost/api/personnel/reorder", {
        orderedIds: [3, 2, 1],
      })
    );

    expect(await response.json()).toEqual({ error: "排序失败" });
  });

  test("GET /api/personnel/export returns excel attachment", async () => {
    vi.mocked(exportPersonnelExcel).mockResolvedValue(Buffer.from("excel"));

    const response = await exportPersonnelGet();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  test("GET /api/personnel/export handles export error", async () => {
    vi.mocked(exportPersonnelExcel).mockRejectedValue(new Error("导出失败"));

    const response = await exportPersonnelGet();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "导出失败" });
  });

  test("GET /api/personnel/export uses fallback error message", async () => {
    vi.mocked(exportPersonnelExcel).mockRejectedValue({});

    const response = await exportPersonnelGet();

    expect(await response.json()).toEqual({ error: "导出失败" });
  });

  test("POST /api/personnel/import validates file and forwards buffer", async () => {
    const missingRequest = new Request("http://localhost/api/personnel/import", {
      method: "POST",
      body: new FormData(),
    });
    const missingResponse = await importPersonnelPost(missingRequest);

    expect(missingResponse.status).toBe(400);
    expect(await missingResponse.json()).toEqual({ error: "请选择文件" });

    vi.mocked(importPersonnelFromExcel).mockResolvedValue({
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "roster.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );

    const response = await importPersonnelPost(
      new Request("http://localhost/api/personnel/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(importPersonnelFromExcel).toHaveBeenCalledWith(expect.any(Buffer));
  });

  test("POST /api/personnel/import handles import error", async () => {
    vi.mocked(importPersonnelFromExcel).mockRejectedValue(new Error("导入失败"));

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "roster.xlsx")
    );

    const response = await importPersonnelPost(
      new Request("http://localhost/api/personnel/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "导入失败" });
  });

  test("POST /api/personnel/import uses fallback error message", async () => {
    vi.mocked(importPersonnelFromExcel).mockRejectedValue({});

    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([1])], "roster.xlsx"));

    const response = await importPersonnelPost(
      new Request("http://localhost/api/personnel/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(await response.json()).toEqual({ error: "导入失败" });
  });
});
