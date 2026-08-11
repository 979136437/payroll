import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { payrollRecord, payrollSheet } from "@/lib/db/schema";
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
import { createPersonnel } from "@/lib/services/personnel.service";
import { cleanupTempDb, useTempDb } from "@/test/db-test-utils";

describe("payroll.service", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = useTempDb("payroll-service");
  });

  afterEach(() => {
    cleanupTempDb(dbPath);
  });

  test("createPayrollSheet trims name and rejects duplicates", async () => {
    const created = await createPayrollSheet({ name: "  六月工资  " });

    expect(created.name).toBe("六月工资");

    await expect(createPayrollSheet({ name: "六月工资" })).rejects.toThrow(
      "工资表名称已存在"
    );
  });

  test("createPayrollSheet rejects blank names", async () => {
    await expect(createPayrollSheet({ name: "   " })).rejects.toThrow(
      "工资表名称不能为空"
    );
  });

  test("createPayrollSheet copies source personnel with zero net pay", async () => {
    const sourceSheet = await createPayrollSheet({ name: "来源表" });
    const first = await createPersonnel({ name: "张三" });
    const second = await createPersonnel({ name: "李四" });

    await addPersonnelToSheet(sourceSheet.id, [first.id, second.id], {
      defaultNetPay: 300,
    });

    const copied = await createPayrollSheet({
      name: "目标表",
      sourceSheetId: sourceSheet.id,
    });
    const detail = await getPayrollSheetDetail(copied.id);

    expect(detail?.records.map((record) => record.personnelId)).toEqual([
      first.id,
      second.id,
    ]);
    expect(detail?.records.every((record) => record.netPay === 0)).toBe(true);
  });

  test("createPayrollSheet rolls back when the source sheet is missing", async () => {
    await expect(
      createPayrollSheet({ name: "目标表", sourceSheetId: 999 })
    ).rejects.toThrow("来源工资表不存在");

    await expect(listPayrollSheets()).resolves.toEqual([]);
  });

  test("listPayrollSheets includes counts and total net pay", async () => {
    const sheet = await createPayrollSheet({ name: "工资表A" });
    const first = await createPersonnel({ name: "张三" });
    const second = await createPersonnel({ name: "李四" });

    await addPersonnelToSheet(sheet.id, [first.id, second.id], {
      perPersonNetPay: {
        [first.id]: 100,
        [second.id]: 200,
      },
    });

    const result = await listPayrollSheets();

    expect(result[0]).toMatchObject({
      id: sheet.id,
      personnelCount: 2,
      totalNetPay: 300,
    });
  });

  test("addPersonnelToSheet rolls back all inserts when one record fails", async () => {
    const sheet = await createPayrollSheet({ name: "工资表A" });
    const person = await createPersonnel({ name: "张三" });

    await expect(
      addPersonnelToSheet(sheet.id, [person.id, 999], { defaultNetPay: 100 })
    ).rejects.toThrow("部分人员不存在");

    const detail = await getPayrollSheetDetail(sheet.id);
    expect(detail?.records).toHaveLength(0);
  });

  test("personnel mutations reject missing sheets even with empty input", async () => {
    await expect(addPersonnelToSheet(999, [])).rejects.toThrow("工资表不存在");
    await expect(removePersonnelFromSheet(999, [])).rejects.toThrow(
      "工资表不存在"
    );
  });

  test("removePersonnelFromSheet removes selected records and touches sheet", async () => {
    const sheet = await createPayrollSheet({ name: "工资表A" });
    const first = await createPersonnel({ name: "张三" });
    const second = await createPersonnel({ name: "李四" });

    await addPersonnelToSheet(sheet.id, [first.id, second.id], {
      defaultNetPay: 100,
    });

    await removePersonnelFromSheet(sheet.id, [first.id]);

    const detail = await getPayrollSheetDetail(sheet.id);

    expect(detail?.records).toHaveLength(1);
    expect(detail?.records[0]?.personnelId).toBe(second.id);
  });

  test("updatePayrollRecordNetPay and export weight return null for missing records", async () => {
    expect(await updatePayrollRecordNetPay(999, 100)).toBeNull();
    expect(await updatePayrollRecordExportWeight(999, 1)).toBeNull();
  });

  test("updatePayrollRecordNetPay and export weight persist changes", async () => {
    const sheet = await createPayrollSheet({ name: "工资表A" });
    const person = await createPersonnel({ name: "张三" });

    await addPersonnelToSheet(sheet.id, [person.id], { defaultNetPay: 120 });

    const detail = await getPayrollSheetDetail(sheet.id);
    const recordId = detail?.records[0]?.recordId;

    if (!recordId) {
      throw new Error("Expected payroll record to exist");
    }

    const updatedNetPay = await updatePayrollRecordNetPay(recordId, 250);
    const updatedWeight = await updatePayrollRecordExportWeight(recordId, 5);

    expect(updatedNetPay?.netPay).toBe(250);
    expect(updatedWeight?.exportWeight).toBe(5);
  });

  test("deletePayrollSheet removes related records and reports missing sheets", async () => {
    const sheet = await createPayrollSheet({ name: "工资表A" });
    const person = await createPersonnel({ name: "张三" });

    await addPersonnelToSheet(sheet.id, [person.id], { defaultNetPay: 88 });

    expect(await deletePayrollSheet(sheet.id)).toEqual({ deleted: true });
    expect(await deletePayrollSheet(sheet.id)).toEqual({ deleted: false });

    const db = getDb();
    const records = await db
      .select()
      .from(payrollRecord)
      .where(eq(payrollRecord.payrollSheetId, sheet.id));
    const sheets = await db
      .select()
      .from(payrollSheet)
      .where(eq(payrollSheet.id, sheet.id));

    expect(records).toHaveLength(0);
    expect(sheets).toHaveLength(0);
  });

  test("getPayrollSheetDetail returns null for missing sheets", async () => {
    await expect(getPayrollSheetDetail(999)).resolves.toBeNull();
  });
});
