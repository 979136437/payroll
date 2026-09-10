import ExcelJS from "exceljs";
import { inflateRawSync } from "node:zlib";
import { PersonnelError } from "./errors";
import { personInput, type PersonInput } from "./validation";

export const headers = ["序号", "姓名", "性别", "民族", "籍贯", "身份证号码", "工资卡号", "开户行", "工种", "上场时间", "撤场时间", "联系电话", "备注"];
const columns = { name: 2, gender: 3, ethnicity: 4, nativePlace: 5, idCardNumber: 6, salaryCardNumber: 7, bankName: 8, phone: 12 } as const;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 在解析工作表前检查 ZIP 中央目录，限制解压规模，避免小压缩包耗尽内存。
export function checkArchive(buffer: Buffer) {
  if (buffer.length > MAX_FILE_SIZE) throw new PersonnelError("文件不能超过5 MB", 413);
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new PersonnelError("不是有效的xlsx文件");
  const count = buffer.readUInt16LE(end + 10);
  let position = buffer.readUInt32LE(end + 16);
  let expanded = 0;
  if (count > 200 || count === 0) throw new PersonnelError("工作簿结构超出限制");
  for (let i = 0; i < count; i++) {
    if (position + 46 > end || buffer.readUInt32LE(position) !== 0x02014b50) throw new PersonnelError("工作簿压缩结构无效");
    const compressed = buffer.readUInt32LE(position + 20);
    const size = buffer.readUInt32LE(position + 24);
    expanded += size;
    if (expanded > 25 * 1024 * 1024) throw new PersonnelError("工作簿解压大小不能超过25 MB", 413);
    const local = buffer.readUInt32LE(position + 42);
    if (local + 30 > position || buffer.readUInt32LE(local) !== 0x04034b50) throw new PersonnelError("工作簿压缩结构无效");
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (start + compressed > position) throw new PersonnelError("工作簿压缩结构无效");
    const method = buffer.readUInt16LE(position + 10);
    if (![0, 8].includes(method) || (buffer.readUInt16LE(position + 8) & 1)) throw new PersonnelError("不支持加密或特殊压缩工作簿");
    // 不只相信 ZIP 声明的长度，使用解压上限验证实际内容。
    try {
      const data = buffer.subarray(start, start + compressed);
      const actual = method === 0 ? data.length : inflateRawSync(data, { maxOutputLength: Math.max(1, size) }).length;
      if (actual !== size) throw new Error();
    } catch { throw new PersonnelError("工作簿解压校验失败"); }
    position += 46 + buffer.readUInt16LE(position + 28) + buffer.readUInt16LE(position + 30) + buffer.readUInt16LE(position + 32);
  }
}

export async function readRoster(buffer: Buffer) {
  checkArchive(buffer);
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer as never); }
  catch { throw new PersonnelError("无法读取工作簿，请使用有效的xlsx文件"); }
  const sheet = workbook.getWorksheet("花名册");
  if (!sheet || headers.some((header, index) => sheet.getCell(3, index + 1).text.trim() !== header)) {
    throw new PersonnelError("请使用花名册模板：工作表名为花名册，第3行为固定的13列表头");
  }
  if (sheet.rowCount > 5003) throw new PersonnelError("每次最多导入5000行人员");
  const issues: { row: number; field: string; message: string }[] = [];
  const rows: { row: number; person: PersonInput }[] = [];
  const names = new Set<string>();
  for (let row = 4; row <= sheet.rowCount; row++) {
    if (headers.every((_, index) => !sheet.getCell(row, index + 1).text.trim())) continue;
    const draft: Record<string, string> = {};
    for (const [field, column] of Object.entries(columns)) {
      const cell = sheet.getCell(row, column);
      const value = cell.value;
      if (value !== null && typeof value !== "string" && typeof value !== "number") {
        issues.push({ row, field: headers[column - 1], message: "请填写文本，不支持公式或其他单元格类型" });
      }
      if ([6,7,12].includes(column) && typeof value === "number" && (!Number.isSafeInteger(value) || Math.abs(value) >= 1e15)) {
        issues.push({ row, field: headers[column - 1], message: "号码可能已丢失精度，请从原始资料重新粘贴为文本" });
      }
      draft[field] = value === null ? "" : cell.text;
    }
    const parsed = personInput.safeParse(draft);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push({ row, field: headers[columns[issue.path[0] as keyof typeof columns] - 1] ?? "人员", message: issue.message });
      continue;
    }
    if (names.has(parsed.data.name)) issues.push({ row, field: "姓名", message: "文件内姓名重复" });
    names.add(parsed.data.name);
    rows.push({ row, person: parsed.data });
  }
  if (issues.length) throw new PersonnelError("导入校验失败，未写入任何人员", 400, issues);
  if (!rows.length) throw new PersonnelError("文件中没有可导入的人员");
  return rows;
}

export async function writeRoster(people: PersonInput[], unit: string, month: string) {
  if (unit.length > 100 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new PersonnelError("编制单位或月份格式无效");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("花名册");
  sheet.mergeCells("A1:M1"); sheet.mergeCells("A2:D2"); sheet.mergeCells("E2:F2"); sheet.mergeCells("G2:M2");
  sheet.getCell("A1").value = "农民工花名册";
  sheet.getCell("A2").value = unit ? `编制单位：${unit}` : "编制单位";
  sheet.getCell("E2").value = `${Number(month.slice(0,4))}年${Number(month.slice(5))}月`;
  sheet.getRow(3).values = headers;
  people.forEach((person, index) => sheet.addRow([index + 1, person.name, person.gender, person.ethnicity, person.nativePlace, person.idCardNumber, person.salaryCardNumber, person.bankName, "砌砖", "", "", person.phone, ""]));
  [6,10,8,10,28,22,22,24,10,12,12,14,10].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.eachRow(row => {
    row.height = row.number === 1 ? 28 : 30;
    for (let column = 1; column <= 13; column++) {
      const cell = row.getCell(column);
      cell.font = { name: "宋体", size: row.number === 1 ? 18 : 11, bold: row.number === 1 || row.number === 3 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      if (row.number >= 3) cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      if (row.number >= 4 && [6,7,12].includes(column)) cell.numFmt = "@";
    }
  });
  return workbook.xlsx.writeBuffer();
}
