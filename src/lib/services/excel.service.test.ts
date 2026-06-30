import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

import { getDb } from "@/lib/db";
import { payrollRecord } from "@/lib/db/schema";
import {
  exportPayrollSheetExcel,
  exportPersonnelExcel,
  importPersonnelFromExcel,
} from "@/lib/services/excel.service";
import { createPayrollSheet } from "@/lib/services/payroll.service";
import { createPersonnel, listPersonnel } from "@/lib/services/personnel.service";
import { cleanupTempDb, useTempDb } from "@/test/db-test-utils";

function buildRosterWorkbook(rows: Array<Array<string | number | null>>) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "花名册");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

async function readWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe("excel.service", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = useTempDb("excel-service");
  });

  afterEach(() => {
    cleanupTempDb(dbPath);
  });

  test("importPersonnelFromExcel rejects mismatched template", async () => {
    const buffer = buildRosterWorkbook([["错误表头"]]);

    await expect(importPersonnelFromExcel(buffer)).rejects.toThrow(
      "导入模板不匹配，请使用固定花名册表头"
    );
  });

  test("importPersonnelFromExcel supports direct roster header without index column", async () => {
    const buffer = buildRosterWorkbook([
      [
        "姓名",
        "性别",
        "民族",
        "籍贯",
        "身份证号码",
        "工资卡号",
        "开户行",
        "工种",
        "上场时间",
        "撤场时间",
        "联系电话",
        "备注",
      ],
      ["张三", "男", "汉", "四川", "ID-1", "CARD-1", "工行", "砌砖", "", "", "138", ""],
    ]);

    const result = await importPersonnelFromExcel(buffer);

    expect(result.createdCount).toBe(1);
    expect((await listPersonnel())[0]?.name).toBe("张三");
  });

  test("importPersonnelFromExcel handles create update skip and reorder", async () => {
    const existing = await createPersonnel({
      name: "旧张三",
      idCardNumber: "ID-1",
      phoneNumber: "111",
    });
    const untouched = await createPersonnel({
      name: "王五",
      idCardNumber: "ID-2",
    });

    const buffer = buildRosterWorkbook([
      [
        "序号",
        "姓名",
        "性别",
        "民族",
        "籍贯",
        "身份证号码",
        "工资卡号",
        "开户行",
        "工种",
        "上场时间",
        "撤场时间",
        "联系电话",
        "备注",
      ],
      [1, "张三", "男", "汉", "四川", "ID-1", "CARD-1", "工行", "砌砖", "", "", "222", ""],
      [2, "李四", "男", "汉", "重庆", "ID-3", "CARD-2", "农行", "砌砖", "", "", "333", ""],
      [3, "", "男", "", "", "", "", "", "", "", "", "", ""],
    ]);

    const result = await importPersonnelFromExcel(buffer);

    expect(result).toEqual({
      createdCount: 1,
      updatedCount: 1,
      skippedCount: 1,
      errors: [],
    });

    const personnel = await listPersonnel();

    expect(personnel.map((item) => item.name)).toEqual(["张三", "李四", "王五"]);
    expect(personnel[0]?.id).toBe(existing.id);
    expect(personnel[2]?.id).toBe(untouched.id);
  });

  test("exportPersonnelExcel writes roster worksheet", async () => {
    await createPersonnel({
      name: "张三",
      gender: "男",
      ethnicity: "汉",
      nativePlace: "四川",
      idCardNumber: "ID-1",
    });

    const buffer = await exportPersonnelExcel();
    const workbook = await readWorkbook(buffer);
    const worksheet = workbook.getWorksheet("花名册");

    expect(worksheet?.getCell("A1").value).toBe("农民工花名册");
    expect(worksheet?.getCell("B4").value).toBe("张三");
    expect(worksheet?.getCell("F4").value).toBe("ID-1");
  });

  test("exportPayrollSheetExcel sorts by export weight then record id", async () => {
    const sheet = await createPayrollSheet({ name: "六月工资" });
    const first = await createPersonnel({ name: "张三", idCardNumber: "ID-1" });
    const second = await createPersonnel({ name: "李四", idCardNumber: "ID-2" });
    const third = await createPersonnel({ name: "王五", idCardNumber: "ID-3" });
    const db = getDb();

    await db.insert(payrollRecord).values([
      {
        payrollSheetId: sheet.id,
        personnelId: first.id,
        netPay: 100,
        exportWeight: null,
        updatedAt: "1",
      },
      {
        payrollSheetId: sheet.id,
        personnelId: second.id,
        netPay: 200,
        exportWeight: 1,
        updatedAt: "1",
      },
      {
        payrollSheetId: sheet.id,
        personnelId: third.id,
        netPay: 300,
        exportWeight: 2,
        updatedAt: "1",
      },
    ]);

    const buffer = await exportPayrollSheetExcel(sheet.id);
    const workbook = await readWorkbook(buffer);
    const payrollWorksheet = workbook.getWorksheet("工资表");

    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual([
      "花名册",
      "工资表",
      "农民工考勤表",
    ]);
    expect(payrollWorksheet?.getCell("B4").value).toBe("李四");
    expect(payrollWorksheet?.getCell("B5").value).toBe("王五");
    expect(payrollWorksheet?.getCell("B6").value).toBe("张三");
  });

  test("exportPayrollSheetExcel falls back to record order when weights are all null", async () => {
    const sheet = await createPayrollSheet({ name: "七月工资" });
    const first = await createPersonnel({ name: "甲", idCardNumber: "A-1" });
    const second = await createPersonnel({ name: "乙", idCardNumber: "A-2" });
    const db = getDb();

    await db.insert(payrollRecord).values([
      {
        payrollSheetId: sheet.id,
        personnelId: first.id,
        netPay: 50,
        exportWeight: null,
        updatedAt: "1",
      },
      {
        payrollSheetId: sheet.id,
        personnelId: second.id,
        netPay: 60,
        exportWeight: null,
        updatedAt: "1",
      },
    ]);

    const buffer = await exportPayrollSheetExcel(sheet.id);
    const workbook = await readWorkbook(buffer);
    const payrollWorksheet = workbook.getWorksheet("工资表");

    expect(payrollWorksheet?.getCell("B4").value).toBe("甲");
    expect(payrollWorksheet?.getCell("B5").value).toBe("乙");
  });

  test("exportPayrollSheetExcel rejects missing sheet", async () => {
    await expect(exportPayrollSheetExcel(999)).rejects.toThrow("未找到当前工资表");
  });
});
