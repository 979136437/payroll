import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readRoster, writeRoster, checkArchive, MAX_FILE_SIZE } from "./workbook";

const person = { name: "测试人员", gender: "男", ethnicity: "汉族", nativePlace: "测试", idCardNumber: "001234567890123456", salaryCardNumber: "00123456789012345678", bankName: "测试银行", phone: "00123456789" };
async function workbook() {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await writeRoster([person], "测试单位", "2026-09") as never);
  return book;
}
async function encode(book: ExcelJS.Workbook) { return Buffer.from(await book.xlsx.writeBuffer()); }
describe("花名册读写", () => {
  it("保留13列、合并标题和长号码，忽略四个额外字段", async () => {
    const book = await workbook();
    const sheet = book.getWorksheet("花名册")!;
    expect(sheet.getCell("A1").value).toBe("农民工花名册");
    expect(sheet.getCell("M1").isMerged).toBe(true);
    expect(sheet.getCell("A2").value).toBe("编制单位：测试单位");
    expect(sheet.getCell("E2").value).toBe("2026年9月");
    expect(sheet.getCell("I4").value).toBe("砌砖");
    expect(sheet.getCell("F4").numFmt).toBe("@");
    expect(sheet.getCell("F4").value).toBe(person.idCardNumber);
    sheet.getCell("I4").value = "其他工种";
    sheet.getCell("J4").value = "2026-01-01";
    sheet.getCell("M4").value = "不保存";
    sheet.getRow(5).values = [null, " "];
    expect(await readRoster(await encode(book))).toEqual([{ row: 4, person }]);
  });
  it("空模板可下载但无人员不可导入", async () => {
    const buffer = Buffer.from(await writeRoster([], "", "2026-09"));
    await expect(readRoster(buffer)).rejects.toThrow("没有可导入");
  });
  it("报告原始行号与重复姓名", async () => {
    const buffer = Buffer.from(await writeRoster([person, person], "", "2026-09"));
    await expect(readRoster(buffer)).rejects.toMatchObject({ issues: [{ row: 5, field: "姓名", message: "文件内姓名重复" }] });
  });
  it.each([["B4", ""], ["F4", 123456789012345678], ["G4", { formula: "1+1", result: 2 }], ["B4", "a".repeat(101)]])("拒绝错误单元格 %s", async (cell, value) => {
    const book = await workbook();
    book.getWorksheet("花名册")!.getCell(cell as string).value = value as ExcelJS.CellValue;
    await expect(readRoster(await encode(book))).rejects.toMatchObject({ status: 400, issues: expect.arrayContaining([expect.objectContaining({ row: 4 })]) });
  });
  it("接受安全整数电话，并拒绝错误表头和超量行", async () => {
    const book = await workbook();
    const sheet = book.getWorksheet("花名册")!;
    sheet.getCell("L4").value = 13800000000;
    expect((await readRoster(await encode(book)))[0].person.phone).toBe("13800000000");
    sheet.getCell("B3").value = "错误";
    await expect(readRoster(await encode(book))).rejects.toThrow("表头");
    sheet.getCell("B3").value = "姓名";
    sheet.getCell("B5004").value = "过多";
    await expect(readRoster(await encode(book))).rejects.toThrow("5000");
  });
  it("拒绝错误月份和过长单位", async () => {
    await expect(writeRoster([], "", "2026-13")).rejects.toThrow();
    await expect(writeRoster([], "a".repeat(101), "2026-09")).rejects.toThrow();
  });
  it("拒绝无效压缩包、超限大小与声明解压大小", async () => {
    expect(() => checkArchive(Buffer.from("invalid"))).toThrow();
    expect(() => checkArchive(Buffer.alloc(MAX_FILE_SIZE + 1))).toThrow("5 MB");
    const buffer = Buffer.from(await writeRoster([], "", "2026-09"));
    const position = buffer.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
    buffer.writeUInt32LE(26 * 1024 * 1024, position + 24);
    expect(() => checkArchive(buffer)).toThrow("25 MB");
  });
});
