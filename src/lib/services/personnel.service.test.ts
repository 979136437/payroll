import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { payrollRecord, payrollSheet, personnel } from "@/lib/db/schema";
import {
  createPersonnel,
  deletePersonnel,
  deletePersonnelBatch,
  getPersonnelById,
  listPersonnel,
  PERSONNEL_REORDER_INPUT_ERROR,
  reorderPersonnel,
  updatePersonnel,
} from "@/lib/services/personnel.service";
import { cleanupTempDb, useTempDb } from "@/test/db-test-utils";

describe("personnel.service", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = useTempDb("personnel-service");
  });

  afterEach(() => {
    cleanupTempDb(dbPath);
  });

  test("createPersonnel trims fields and defaults job type", async () => {
    const created = await createPersonnel({
      name: "  张三  ",
      gender: "  男 ",
      nativePlace: "   ",
      idCardNumber: " 123 ",
      phoneNumber: " 13800000000 ",
    });

    expect(created).toMatchObject({
      name: "张三",
      gender: "男",
      nativePlace: null,
      idCardNumber: "123",
      phoneNumber: "13800000000",
    });

    const db = getDb();
    const rows = await db.select().from(personnel);

    expect(rows[0]?.jobType).toBe("砌砖");
    expect(rows[0]?.sortIndex).toBe(0);
  });

  test("createPersonnel rejects duplicate id card numbers", async () => {
    await createPersonnel({ name: "张三", idCardNumber: "123" });

    await expect(
      createPersonnel({ name: "李四", idCardNumber: "123" })
    ).rejects.toThrow("身份证号码已存在");
  });

  test("createPersonnel rejects blank names", async () => {
    await expect(createPersonnel({ name: "   " })).rejects.toThrow("姓名不能为空");
  });

  test("listPersonnel returns records ordered by sort index then id", async () => {
    await createPersonnel({ name: "张三" });
    await createPersonnel({ name: "李四" });
    await reorderPersonnel([2, 1]);

    const result = await listPersonnel();

    expect(result.map((item) => item.id)).toEqual([2, 1]);
  });

  test("reorderPersonnel rejects incomplete or duplicate personnel ids", async () => {
    await createPersonnel({ name: "张三" });
    await createPersonnel({ name: "李四" });

    await expect(reorderPersonnel([2, 2])).rejects.toThrow(
      PERSONNEL_REORDER_INPUT_ERROR
    );
    await expect(reorderPersonnel([2])).rejects.toThrow(
      PERSONNEL_REORDER_INPUT_ERROR
    );
    await expect(reorderPersonnel([2, 1, 999])).rejects.toThrow(
      PERSONNEL_REORDER_INPUT_ERROR
    );

    expect((await listPersonnel()).map((item) => item.id)).toEqual([1, 2]);
  });

  test("updatePersonnel returns null for missing record and trims fields", async () => {
    expect(
      await updatePersonnel(999, { name: "不存在" })
    ).toBeNull();

    const created = await createPersonnel({ name: "王五", remark: "  原备注 " });
    const updated = await updatePersonnel(created.id, {
      name: "  王五新  ",
      remark: "   ",
      bankName: " 工行 ",
    });

    expect(updated).toMatchObject({
      name: "王五新",
      remark: null,
      bankName: "工行",
    });
  });

  test("updatePersonnel rejects blank names and duplicate id cards", async () => {
    const first = await createPersonnel({ name: "张三", idCardNumber: "ID-1" });
    const second = await createPersonnel({ name: "李四", idCardNumber: "ID-2" });

    await expect(updatePersonnel(first.id, { name: "   " })).rejects.toThrow("姓名不能为空");
    await expect(
      updatePersonnel(second.id, { name: "李四", idCardNumber: "ID-1" })
    ).rejects.toThrow("身份证号码已存在");
  });

  test("deletePersonnel removes linked payroll records and updates sheet timestamp", async () => {
    const db = getDb();
    const [createdSheet] = await db
      .insert(payrollSheet)
      .values({ name: "六月工资", updatedAt: "1" })
      .returning();
    const created = await createPersonnel({ name: "张三" });

    await db.insert(payrollRecord).values({
      payrollSheetId: createdSheet.id,
      personnelId: created.id,
      netPay: 100,
      updatedAt: "1",
    });

    expect(await deletePersonnel(created.id)).toBe(true);
    expect(await deletePersonnel(created.id)).toBe(false);

    const remainingPersonnel = await getPersonnelById(created.id);
    const remainingRecords = await db
      .select()
      .from(payrollRecord)
      .where(eq(payrollRecord.payrollSheetId, createdSheet.id));
    const updatedSheet = await db
      .select()
      .from(payrollSheet)
      .where(eq(payrollSheet.id, createdSheet.id));

    expect(remainingPersonnel).toBeNull();
    expect(remainingRecords).toHaveLength(0);
    expect(updatedSheet[0]?.updatedAt).not.toBe("1");
  });

  test("deletePersonnelBatch deduplicates ids and reports deleted count", async () => {
    const first = await createPersonnel({ name: "张三" });
    const second = await createPersonnel({ name: "李四" });

    const result = await deletePersonnelBatch([first.id, first.id, second.id, 999]);

    expect(result).toEqual({ deletedCount: 2 });
    expect(await listPersonnel()).toHaveLength(0);
  });

  test("deletePersonnelBatch returns zero for empty input", async () => {
    await expect(deletePersonnelBatch([])).resolves.toEqual({ deletedCount: 0 });
  });
});
