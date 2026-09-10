import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { persons } from "@/db/schema";
import { decryptSensitive, encryptSensitive } from "./crypto";
import { PersonnelError } from "./errors";
import type { PersonInput } from "./validation";
import type { Person } from "../model/personnel";

function values(input: PersonInput) {
  const { idCardNumber, salaryCardNumber, phone, ...publicFields } = input;
  return { ...publicFields, sensitiveInfo: encryptSensitive({ idCardNumber, salaryCardNumber, phone }) };
}

export const personnelRepository = {
  async list(): Promise<Person[]> {
    const rows = await getDb().select().from(persons).orderBy(asc(persons.id));
    return rows.map(row => ({
      id: String(row.id), name: row.name, gender: row.gender ?? "", ethnicity: row.ethnicity ?? "",
      nativePlace: row.nativePlace ?? "", bankName: row.bankName ?? "", ...decryptSensitive(row.sensitiveInfo),
    }));
  },
  async create(input: PersonInput) {
    const now = new Date();
    const ids = await getDb().insert(persons).values({ ...values(input), createdAt: now, updatedAt: now }).$returningId();
    return String(ids[0].id);
  },
  async update(id: number, input: PersonInput) {
    await getDb().transaction(async tx => {
      const rows = await tx.select({ id: persons.id }).from(persons).where(eq(persons.id, id)).for("update");
      if (!rows.length) throw new PersonnelError("人员不存在，请刷新列表", 404);
      await tx.update(persons).set({ ...values(input), updatedAt: new Date() }).where(eq(persons.id, id));
    });
  },
  async remove(ids: number[]) {
    await getDb().transaction(async tx => {
      const rows = await tx.select({ id: persons.id }).from(persons).where(inArray(persons.id, ids)).for("update");
      if (rows.length !== ids.length) throw new PersonnelError("部分人员已不存在，请刷新列表", 409);
      // 外键 RESTRICT 保留工资历史；任何关联冲突使整批删除回滚。
      await tx.delete(persons).where(inArray(persons.id, ids));
    });
  },
  async importPeople(rows: { row: number; person: PersonInput }[]) {
    await getDb().transaction(async tx => {
      const existing = await tx.select({ name: persons.name }).from(persons);
      const names = new Set(existing.map(item => item.name));
      const issues = rows.filter(item => names.has(item.person.name)).map(item => ({ row: item.row, field: "姓名", message: "姓名已存在" }));
      if (issues.length) throw new PersonnelError("导入失败，未写入任何人员", 409, issues);
      // 分块只控制 SQL 大小，所有块仍在同一事务中提交。
      const now = new Date();
      for (let offset = 0; offset < rows.length; offset += 100) {
        await tx.insert(persons).values(rows.slice(offset, offset + 100).map(item => ({ ...values(item.person), createdAt: now, updatedAt: now })));
      }
    });
  },
};
