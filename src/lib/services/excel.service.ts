import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { getDb, currentTimestamp, normalizeOptionalString } from "@/lib/db";
import { personnel, payrollSheet, payrollRecord } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type { PersonnelImportResult } from "@/lib/types";

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

const PAYROLL_HEADERS = [
  "姓名",
  "身份证号",
  "银行卡号",
  "账户银行",
  "出勤\n天数",
  "工资标\n准",
  "应发工\n资",
  "应扣减\n金额",
  "实发\n金额",
  "领款人\n签字",
  "备注",
];

function getCurrentMonthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

function valueOrEmpty(value: string | null | undefined): string {
  return value ?? "";
}

function createBaseCellStyles(): Partial<ExcelJS.Style> {
  return {
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: {
      horizontal: "center",
      vertical: "middle",
      wrapText: false,
    },
    font: {
      size: 11,
    },
  };
}

function createHeaderCellStyle(): Partial<ExcelJS.Style> {
  const base = createBaseCellStyles();
  return {
    ...base,
    font: {
      ...base.font,
      bold: true,
      color: { argb: "FF000000" },
    },
  };
}

function createWrappedHeaderCellStyle(): Partial<ExcelJS.Style> {
  const header = createHeaderCellStyle();
  return {
    ...header,
    alignment: {
      ...header.alignment,
      wrapText: true,
    },
  };
}

function createTitleCellStyle(fontSize: number): Partial<ExcelJS.Style> {
  const base = createBaseCellStyles();
  return {
    ...base,
    font: {
      ...base.font,
      bold: true,
      size: fontSize,
    },
  };
}

function createBodyCellStyle(): Partial<ExcelJS.Style> {
  return createBaseCellStyles();
}

function createNativePlaceCellStyle(): Partial<ExcelJS.Style> {
  const base = createBaseCellStyles();
  return {
    ...base,
    alignment: {
      ...base.alignment,
      wrapText: true,
    },
  };
}

function createTotalLabelCellStyle(): Partial<ExcelJS.Style> {
  const base = createBodyCellStyle();
  return {
    ...base,
    font: {
      ...base.font,
      bold: true,
    },
  };
}

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
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "buffer" });
  } catch {
    throw new Error("导入文件无法解析");
  }

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
  const personnelIndexByIdCard = new Map<string, number>();
  let nextSortIndex = -1;
  for (const [index, item] of currentPersonnel.entries()) {
    if (item.idCardNumber) {
      personnelIndexByIdCard.set(item.idCardNumber, index);
    }
    nextSortIndex = Math.max(nextSortIndex, item.sortIndex);
  }
  nextSortIndex++;
  const importedIds = new Set<number>();
  const now = currentTimestamp();

  for (const [rowIndex, row] of importRows.entries()) {
    if (!row.name.trim()) {
      result.skippedCount++;
      continue;
    }

    const existingIdx = row.idCardNumber
      ? personnelIndexByIdCard.get(row.idCardNumber) ?? -1
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
        importedIds.add(existing.id);
        result.updatedCount++;
      } catch (error: unknown) {
        // 客户端只接收稳定文案，原始数据库异常仅保留在服务端日志中。
        console.error(`[Excel Import] 第 ${rowIndex + 1} 条记录更新失败`, error);
        result.errors.push(`第 ${rowIndex + 1} 条记录：导入失败`);
      }
    } else {
      try {
        const created = await db
          .insert(personnel)
          .values({
            name: row.name.trim(),
            sortIndex: nextSortIndex,
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

        const createdIndex = currentPersonnel.length;
        currentPersonnel.push(created[0]);
        if (created[0].idCardNumber) {
          personnelIndexByIdCard.set(created[0].idCardNumber, createdIndex);
        }
        nextSortIndex++;
        importedIds.add(created[0].id);
        result.createdCount++;
      } catch (error: unknown) {
        console.error(`[Excel Import] 第 ${rowIndex + 1} 条记录创建失败`, error);
        result.errors.push(`第 ${rowIndex + 1} 条记录：导入失败`);
      }
    }
  }

  const existingIdsToKeep: number[] = [];
  for (const item of allPersonnel) {
    if (!importedIds.has(item.id)) {
      existingIdsToKeep.push(item.id);
    }
  }

  const reorderedIds = [...importedIds, ...existingIdsToKeep];
  // 排序写入必须整体成功，避免导入中断后留下部分更新的顺序。
  db.transaction((tx) => {
    for (let i = 0; i < reorderedIds.length; i++) {
      tx
        .update(personnel)
        .set({ sortIndex: i })
        .where(eq(personnel.id, reorderedIds[i]))
        .run();
    }
  });

  return result;
}

export async function exportPersonnelExcel(): Promise<Buffer> {
  const db = getDb();
  const rows = await db
    .select()
    .from(personnel)
    .orderBy(asc(personnel.sortIndex), asc(personnel.id));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("花名册");

  const titleFormat = createTitleCellStyle(16);
  const infoFormat = createBaseCellStyles();
  const cellFormat = createBodyCellStyle();
  const nativePlaceFormat = createNativePlaceCellStyle();
  const headerFormat = createHeaderCellStyle();

  worksheet.mergeCells("A1:M1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "农民工花名册";
  Object.assign(titleCell, { style: titleFormat });

  worksheet.mergeCells("A2:D2");
  const unitLabelCell = worksheet.getCell("A2");
  unitLabelCell.value = "编制单位";
  Object.assign(unitLabelCell, { style: infoFormat });

  worksheet.mergeCells("E2:F2");
  const monthCell = worksheet.getCell("E2");
  monthCell.value = getCurrentMonthLabel();
  Object.assign(monthCell, { style: infoFormat });

  worksheet.mergeCells("G2:M2");
  const blankCell2 = worksheet.getCell("G2");
  Object.assign(blankCell2, { style: infoFormat });

  const headerRowNum = 3;
  worksheet.getRow(headerRowNum).getCell(1).value = "序号";
  Object.assign(
    worksheet.getRow(headerRowNum).getCell(1),
    { style: headerFormat }
  );
  ROSTER_HEADERS.forEach((header, idx) => {
    const cell = worksheet.getRow(headerRowNum).getCell(idx + 2);
    cell.value = header;
    Object.assign(cell, { style: headerFormat });
  });

  rows.forEach((p, idx) => {
    const rowNum = idx + 4;
    const row = worksheet.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    Object.assign(row.getCell(1), { style: cellFormat });

    const values = [
      p.name,
      valueOrEmpty(p.gender),
      valueOrEmpty(p.ethnicity),
      valueOrEmpty(p.nativePlace),
      valueOrEmpty(p.idCardNumber),
      valueOrEmpty(p.payrollCardNumber),
      valueOrEmpty(p.bankName),
      valueOrEmpty(p.jobType),
      valueOrEmpty(p.startDate),
      valueOrEmpty(p.endDate),
      valueOrEmpty(p.phoneNumber),
      valueOrEmpty(p.remark),
    ];

    values.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 2);
      cell.value = value;
      const style = colIdx === 3 ? nativePlaceFormat : cellFormat;
      Object.assign(cell, { style });
    });
  });

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 24;

  const colWidths = [6, 10, 8, 8, 28, 22, 22, 24, 10, 12, 12, 14, 10];
  colWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
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
      jobType: personnel.jobType,
      gender: personnel.gender,
      ethnicity: personnel.ethnicity,
      nativePlace: personnel.nativePlace,
      startDate: personnel.startDate,
      endDate: personnel.endDate,
      phoneNumber: personnel.phoneNumber,
      remark: personnel.remark,
      exportWeight: payrollRecord.exportWeight,
      attendanceDays: payrollRecord.attendanceDays,
      wageStandard: payrollRecord.wageStandard,
      grossPay: payrollRecord.grossPay,
      deductionAmount: payrollRecord.deductionAmount,
      netPay: payrollRecord.netPay,
      payeeSignature: payrollRecord.payeeSignature,
      payrollRemark: payrollRecord.remark,
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

  const workbook = new ExcelJS.Workbook();

  writeRosterSheet(workbook, sortedRecords);
  writePayrollSheet(workbook, sortedRecords);
  writeAttendanceSheet(workbook, sortedRecords);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function writeRosterSheet(
  workbook: ExcelJS.Workbook,
  records: any[]
) {
  const worksheet = workbook.addWorksheet("花名册");

  const titleFormat = createTitleCellStyle(16);
  const infoFormat = createBaseCellStyles();
  const cellFormat = createBodyCellStyle();
  const nativePlaceFormat = createNativePlaceCellStyle();
  const headerFormat = createHeaderCellStyle();

  worksheet.mergeCells("A1:M1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "农民工花名册";
  Object.assign(titleCell, { style: titleFormat });

  worksheet.mergeCells("A2:D2");
  const unitLabelCell = worksheet.getCell("A2");
  unitLabelCell.value = "编制单位";
  Object.assign(unitLabelCell, { style: infoFormat });

  worksheet.mergeCells("E2:F2");
  const monthCell = worksheet.getCell("E2");
  monthCell.value = getCurrentMonthLabel();
  Object.assign(monthCell, { style: infoFormat });

  worksheet.mergeCells("G2:M2");
  const blankCell2 = worksheet.getCell("G2");
  Object.assign(blankCell2, { style: infoFormat });

  const headerRowNum = 3;
  worksheet.getRow(headerRowNum).getCell(1).value = "序号";
  Object.assign(
    worksheet.getRow(headerRowNum).getCell(1),
    { style: headerFormat }
  );
  ROSTER_HEADERS.forEach((header, idx) => {
    const cell = worksheet.getRow(headerRowNum).getCell(idx + 2);
    cell.value = header;
    Object.assign(cell, { style: headerFormat });
  });

  records.forEach((r, idx) => {
    const rowNum = idx + 4;
    const row = worksheet.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    Object.assign(row.getCell(1), { style: cellFormat });

    const values = [
      r.name,
      valueOrEmpty(r.gender),
      valueOrEmpty(r.ethnicity),
      valueOrEmpty(r.nativePlace),
      valueOrEmpty(r.idCardNumber),
      valueOrEmpty(r.payrollCardNumber),
      valueOrEmpty(r.bankName),
      valueOrEmpty(r.jobType),
      valueOrEmpty(r.startDate),
      valueOrEmpty(r.endDate),
      valueOrEmpty(r.phoneNumber),
      valueOrEmpty(r.remark),
    ];

    values.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 2);
      cell.value = value;
      const style = colIdx === 3 ? nativePlaceFormat : cellFormat;
      Object.assign(cell, { style });
    });
  });

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 24;

  const colWidths = [6, 10, 8, 8, 28, 22, 22, 24, 10, 12, 12, 14, 10];
  colWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width;
  });
}

function writePayrollSheet(
  workbook: ExcelJS.Workbook,
  records: any[]
) {
  const worksheet = workbook.addWorksheet("工资表");

  const titleFormat = createTitleCellStyle(18);
  const infoFormat = createBaseCellStyles();
  const cellFormat = createBodyCellStyle();
  const headerFormat = createWrappedHeaderCellStyle();
  const totalLabelFormat = createTotalLabelCellStyle();

  worksheet.mergeCells("A1:L1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "工资表";
  Object.assign(titleCell, { style: titleFormat });

  worksheet.mergeCells("A2:L2");
  const unitLabelCell = worksheet.getCell("A2");
  unitLabelCell.value = "单位名称";
  Object.assign(unitLabelCell, { style: infoFormat });

  const headerRowNum = 3;
  worksheet.getRow(headerRowNum).getCell(1).value = "序号";
  Object.assign(
    worksheet.getRow(headerRowNum).getCell(1),
    { style: headerFormat }
  );
  PAYROLL_HEADERS.forEach((header, idx) => {
    const cell = worksheet.getRow(headerRowNum).getCell(idx + 2);
    cell.value = header;
    Object.assign(cell, { style: headerFormat });
  });

  let totalNetPay = 0;
  records.forEach((r, idx) => {
    const rowNum = idx + 4;
    const row = worksheet.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    Object.assign(row.getCell(1), { style: cellFormat });

    const values = [
      r.name,
      valueOrEmpty(r.idCardNumber),
      valueOrEmpty(r.payrollCardNumber),
      valueOrEmpty(r.bankName),
      r.attendanceDays ?? "",
      r.wageStandard ?? "",
      r.grossPay ?? "",
      r.deductionAmount ?? "",
      r.netPay,
      valueOrEmpty(r.payeeSignature),
      valueOrEmpty(r.payrollRemark),
    ];

    values.forEach((value, colIdx) => {
      const cell = row.getCell(colIdx + 2);
      cell.value = value;
      Object.assign(cell, { style: cellFormat });
      if (colIdx >= 4 && colIdx <= 8 && typeof value === "number") {
        cell.numFmt = "0.##";
      }
    });

    totalNetPay += r.netPay;
  });

  const totalRowNum = records.length + 4;
  const totalRow = worksheet.getRow(totalRowNum);
  for (let col = 1; col <= 9; col++) {
    const cell = totalRow.getCell(col);
    cell.value = "";
    Object.assign(cell, { style: cellFormat });
  }

  const totalLabelCell = totalRow.getCell(9);
  totalLabelCell.value = "合计";
  Object.assign(totalLabelCell, { style: totalLabelFormat });

  const totalValueCell = totalRow.getCell(10);
  totalValueCell.value = totalNetPay;
  Object.assign(totalValueCell, { style: cellFormat });
  totalValueCell.numFmt = "0.##";

  for (let col = 11; col <= 12; col++) {
    const cell = totalRow.getCell(col);
    cell.value = "";
    Object.assign(cell, { style: cellFormat });
  }

  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 38;

  const colWidths = [6, 12, 24, 24, 22, 10, 10, 10, 10, 8, 12, 10];
  colWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width;
  });
}

function writeAttendanceSheet(
  workbook: ExcelJS.Workbook,
  records: any[]
) {
  const worksheet = workbook.addWorksheet("农民工考勤表");

  const titleFormat = createTitleCellStyle(16);
  const infoFormat = createBaseCellStyles();
  const cellFormat = createBodyCellStyle();
  const headerFormat = createHeaderCellStyle();

  worksheet.mergeCells(1, 1, 1, 34);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = "农民工考勤表";
  Object.assign(titleCell, { style: titleFormat });

  worksheet.mergeCells(2, 1, 2, 14);
  const unitLabelCell = worksheet.getCell(2, 1);
  unitLabelCell.value = "编制单位";
  Object.assign(unitLabelCell, { style: infoFormat });

  worksheet.mergeCells(2, 15, 2, 18);
  const monthCell = worksheet.getCell(2, 15);
  monthCell.value = getCurrentMonthLabel();
  Object.assign(monthCell, { style: infoFormat });

  worksheet.mergeCells(2, 19, 2, 34);
  const blankCell = worksheet.getCell(2, 19);
  Object.assign(blankCell, { style: infoFormat });

  const headerRowNum = 3;
  ["序号", "姓名", "身份证号"].forEach((header, idx) => {
    const cell = worksheet.getRow(headerRowNum).getCell(idx + 1);
    cell.value = header;
    Object.assign(cell, { style: headerFormat });
  });

  for (let day = 1; day <= 31; day++) {
    const cell = worksheet.getRow(headerRowNum).getCell(day + 3);
    cell.value = String(day);
    Object.assign(cell, { style: headerFormat });
  }

  records.forEach((r, idx) => {
    const rowNum = idx + 4;
    const row = worksheet.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    Object.assign(row.getCell(1), { style: cellFormat });

    row.getCell(2).value = r.name;
    Object.assign(row.getCell(2), { style: cellFormat });

    row.getCell(3).value = valueOrEmpty(r.idCardNumber);
    Object.assign(row.getCell(3), { style: cellFormat });

    for (let col = 4; col <= 34; col++) {
      const cell = row.getCell(col);
      cell.value = "";
      Object.assign(cell, { style: cellFormat });
    }
  });

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 24;

  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 10;
  worksheet.getColumn(3).width = 24;
  for (let col = 4; col <= 34; col++) {
    worksheet.getColumn(col).width = 4;
  }
}
