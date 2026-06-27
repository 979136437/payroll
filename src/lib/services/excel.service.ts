"use server";

import * as XLSX from "xlsx";
import { getDb, currentTimestamp, normalizeOptionalString } from "@/lib/db";
import { personnel, payrollSheet, payrollRecord } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import type { PersonnelImportResult, Personnel } from "@/lib/types";

const ROSTER_HEADERS = [
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
];

function detectRosterHeader(rows: any[][]): { rowIndex: number; colOffset: number } | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row || row.every((cell: any) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const directHeaders = row.slice(0, ROSTER_HEADERS.length).map((cell: any) =>
      String(cell ?? "").trim()
    );
    if (
      directHeaders.length === ROSTER_HEADERS.length &&
      directHeaders.every((h: string, i: number) => h === ROSTER_HEADERS[i])
    ) {
      return { rowIndex, colOffset: 0 };
    }

    const firstCell = row[0] ? String(row[0]).trim() : "";
    const indexedHeaders = row.slice(1, 1 + ROSTER_HEADERS.length).map((cell: any) =>
      String(cell ?? "").trim()
    );
    if (
      firstCell === "序号" &&
      indexedHeaders.length === ROSTER_HEADERS.length &&
      indexedHeaders.every((h: string, i: number) => h === ROSTER_HEADERS[i])
    ) {
      return { rowIndex, colOffset: 1 };
    }
  }
  return null;
}

function parsePersonnelRows(
  rows: any[][],
  headerRowIndex: number,
  colOffset: number
): any[] {
  const result: any[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const values: string[] = [];
    for (let j = 0; j < ROSTER_HEADERS.length; j++) {
      const cell = row[j + colOffset];
      values.push(cell != null ? String(cell).trim() : "");
    }

    if (values.every((v) => v === "")) continue;

    result.push({
      name: values[0] || "",
      gender: values[1] || null,
      ethnicity: values[2] || null,
      nativePlace: values[3] || null,
      idCardNumber: values[4] || null,
      payrollCardNumber: values[5] || null,
      bankName: values[6] || null,
      jobType: values[7] || null,
      startDate: values[8] || null,
      endDate: values[9] || null,
      phoneNumber: values[10] || null,
      remark: values[11] || null,
    });
  }
  return result;
}

export async function importPersonnelFromExcel(
  fileBuffer: Buffer
): Promise<PersonnelImportResult> {
  const db = getDb();
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });

  let importRows: any[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
    }) as any[][];

    const headerInfo = detectRosterHeader(rows);
    if (headerInfo) {
      importRows = parsePersonnelRows(
        rows,
        headerInfo.rowIndex,
        headerInfo.colOffset
      );
      break;
    }
  }

  if (importRows.length === 0) {
    throw new Error("导入模板不匹配，请使用固定花名册表头");
  }

  const result: PersonnelImportResult = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  const allPersonnel = await db
    .select()
    .from(personnel)
    .orderBy(asc(personnel.sortIndex), asc(personnel.id));

  const currentPersonnel = [...allPersonnel];
  const importedIds: number[] = [];
  const now = currentTimestamp();

  for (const row of importRows) {
    if (!row.name.trim()) {
      result.skippedCount++;
      continue;
    }

    const existingIdx = row.idCardNumber
      ? currentPersonnel.findIndex(
          (p) => p.idCardNumber === row.idCardNumber
        )
      : -1;

    if (existingIdx >= 0) {
      const existing = currentPersonnel[existingIdx];
      try {
        const updated = await db
          .update(personnel)
          .set({
            name: row.name.trim(),
            gender: normalizeOptionalString(row.gender),
            ethnicity: normalizeOptionalString(row.ethnicity),
            nativePlace: normalizeOptionalString(row.nativePlace),
            idCardNumber: normalizeOptionalString(row.idCardNumber),
            payrollCardNumber: normalizeOptionalString(row.payrollCardNumber),
            bankName: normalizeOptionalString(row.bankName),
            jobType: normalizeOptionalString(row.jobType),
            startDate: normalizeOptionalString(row.startDate),
            endDate: normalizeOptionalString(row.endDate),
            phoneNumber: normalizeOptionalString(row.phoneNumber),
            remark: normalizeOptionalString(row.remark),
            updatedAt: now,
          })
          .where(eq(personnel.id, existing.id))
          .returning();

        currentPersonnel[existingIdx] = updated[0];
        importedIds.push(existing.id);
        result.updatedCount++;
      } catch (e: any) {
        result.errors.push(`${row.name}: ${e.message}`);
      }
    } else {
      try {
        const maxSort = currentPersonnel.length > 0
          ? Math.max(...currentPersonnel.map((p) => p.sortIndex))
          : -1;
        const created = await db
          .insert(personnel)
          .values({
            name: row.name.trim(),
            sortIndex: maxSort + 1,
            gender: normalizeOptionalString(row.gender),
            ethnicity: normalizeOptionalString(row.ethnicity),
            nativePlace: normalizeOptionalString(row.nativePlace),
            idCardNumber: normalizeOptionalString(row.idCardNumber),
            payrollCardNumber: normalizeOptionalString(row.payrollCardNumber),
            bankName: normalizeOptionalString(row.bankName),
            jobType: normalizeOptionalString(row.jobType),
            startDate: normalizeOptionalString(row.startDate),
            endDate: normalizeOptionalString(row.endDate),
            phoneNumber: normalizeOptionalString(row.phoneNumber),
            remark: normalizeOptionalString(row.remark),
            updatedAt: now,
          })
          .returning();

        currentPersonnel.push(created[0]);
        importedIds.push(created[0].id);
        result.createdCount++;
      } catch (e: any) {
        result.errors.push(`${row.name}: ${e.message}`);
      }
    }
  }

  const existingIdsToKeep = allPersonnel
    .map((p) => p.id)
    .filter((id) => !importedIds.includes(id));

  const reorderedIds = [...importedIds, ...existingIdsToKeep];
  for (let i = 0; i < reorderedIds.length; i++) {
    await db
      .update(personnel)
      .set({ sortIndex: i })
      .where(eq(personnel.id, reorderedIds[i]));
  }

  return result;
}

export async function exportPersonnelExcel(): Promise<Buffer> {
  const db = getDb();
  const rows = await db
    .select()
    .from(personnel)
    .orderBy(asc(personnel.sortIndex), asc(personnel.id));

  const data: any[][] = [];
  data.push(["农民工花名册"]);
  data.push(["编制单位", "", "", "", "", "", "", "", "", "", "", "", ""]);
  data.push([
    "序号",
    ...ROSTER_HEADERS,
  ]);

  rows.forEach((p, idx) => {
    data.push([
      idx + 1,
      p.name,
      p.gender ?? "",
      p.ethnicity ?? "",
      p.nativePlace ?? "",
      p.idCardNumber ?? "",
      p.payrollCardNumber ?? "",
      p.bankName ?? "",
      p.jobType ?? "",
      p.startDate ?? "",
      p.endDate ?? "",
      p.phoneNumber ?? "",
      p.remark ?? "",
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "花名册");

  const colWidths = [
    { wch: 6 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
  ];
  worksheet["!cols"] = colWidths;

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export async function exportPayrollSheetExcel(sheetId: number): Promise<Buffer> {
  const db = getDb();

  const sheetResult = await db
    .select()
    .from(payrollSheet)
    .where(eq(payrollSheet.id, sheetId));
  if (sheetResult.length === 0) {
    throw new Error("未找到当前工资表");
  }

  const recordsResult = await db
    .select({
      recordId: payrollRecord.id,
      personnelId: payrollRecord.personnelId,
      name: personnel.name,
      idCardNumber: personnel.idCardNumber,
      payrollCardNumber: personnel.payrollCardNumber,
      bankName: personnel.bankName,
      exportWeight: payrollRecord.exportWeight,
      attendanceDays: payrollRecord.attendanceDays,
      wageStandard: payrollRecord.wageStandard,
      grossPay: payrollRecord.grossPay,
      deductionAmount: payrollRecord.deductionAmount,
      phoneNumber: personnel.phoneNumber,
      netPay: payrollRecord.netPay,
      payeeSignature: payrollRecord.payeeSignature,
      remark: payrollRecord.remark,
    })
    .from(payrollRecord)
    .innerJoin(personnel, eq(personnel.id, payrollRecord.personnelId))
    .where(eq(payrollRecord.payrollSheetId, sheetId))
    .orderBy(asc(payrollRecord.id));

  const sortedRecords = [...recordsResult].sort((a, b) => {
    const weightOrder =
      a.exportWeight != null && b.exportWeight != null
        ? a.exportWeight - b.exportWeight
        : a.exportWeight != null
          ? -1
          : b.exportWeight != null
            ? 1
            : 0;
    if (weightOrder !== 0) return weightOrder;
    return a.recordId - b.recordId;
  });

  const personnelIds = sortedRecords.map((r) => r.personnelId);
  const personnelList = await db
    .select()
    .from(personnel)
    .where(inArray(personnel.id, personnelIds));

  const personnelMap = new Map(personnelList.map((p) => [p.id, p]));
  const sortedPersonnel = sortedRecords
    .map((r) => personnelMap.get(r.personnelId))
    .filter((p): p is any => p != null);

  const workbook = XLSX.utils.book_new();

  const rosterData: any[][] = [];
  rosterData.push(["农民工花名册"]);
  rosterData.push(["编制单位", "", "", "", "", "", "", "", "", "", "", "", ""]);
  rosterData.push(["序号", ...ROSTER_HEADERS]);
  sortedPersonnel.forEach((p, idx) => {
    rosterData.push([
      idx + 1,
      p.name,
      p.gender ?? "",
      p.ethnicity ?? "",
      p.nativePlace ?? "",
      p.idCardNumber ?? "",
      p.payrollCardNumber ?? "",
      p.bankName ?? "",
      p.jobType ?? "",
      p.startDate ?? "",
      p.endDate ?? "",
      p.phoneNumber ?? "",
      p.remark ?? "",
    ]);
  });
  const rosterSheet = XLSX.utils.aoa_to_sheet(rosterData);
  rosterSheet["!cols"] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, rosterSheet, "花名册");

  const payrollHeaders = [
    "姓名",
    "身份证号",
    "银行卡号",
    "账户银行",
    "出勤天数",
    "工资标准",
    "应发工资",
    "应扣减金额",
    "实发金额",
    "领款人签字",
    "备注",
  ];
  const payrollData: any[][] = [];
  payrollData.push(["工资表"]);
  payrollData.push(["单位名称", ...Array(10).fill("")]);
  payrollData.push(["序号", ...payrollHeaders]);

  let totalNetPay = 0;
  sortedRecords.forEach((r, idx) => {
    payrollData.push([
      idx + 1,
      r.name,
      r.idCardNumber ?? "",
      r.payrollCardNumber ?? "",
      r.bankName ?? "",
      r.attendanceDays ?? "",
      r.wageStandard ?? "",
      r.grossPay ?? "",
      r.deductionAmount ?? "",
      formatDecimal(r.netPay),
      r.payeeSignature ?? "",
      r.remark ?? "",
    ]);
    totalNetPay += r.netPay;
  });

  const totalRow = Array(8).fill("");
  totalRow.push("合计");
  totalRow.push(formatDecimal(totalNetPay));
  totalRow.push("");
  totalRow.push("");
  payrollData.push(totalRow);

  const payrollSheetData = XLSX.utils.aoa_to_sheet(payrollData);
  payrollSheetData["!cols"] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, payrollSheetData, "工资表");

  const attendanceData: any[][] = [];
  attendanceData.push(["农民工考勤表"]);
  attendanceData.push(["编制单位", ...Array(12).fill(""), "", "", "", "", "", "", "", "", ""]);
  const attendanceHeaders = ["序号", "姓名", "身份证号"];
  for (let d = 1; d <= 31; d++) attendanceHeaders.push(String(d));
  attendanceData.push(attendanceHeaders);

  sortedPersonnel.forEach((p, idx) => {
    const row: any[] = [idx + 1, p.name, p.idCardNumber ?? ""];
    for (let d = 0; d < 31; d++) row.push("");
    attendanceData.push(row);
  });

  const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceData);
  const attendanceCols = [
    { wch: 6 },
    { wch: 10 },
    { wch: 24 },
  ];
  for (let d = 0; d < 31; d++) attendanceCols.push({ wch: 4 });
  attendanceSheet["!cols"] = attendanceCols;
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, "农民工考勤表");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function formatDecimal(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}
