import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { RowDataPacket } from "mysql2/promise";
import { persons, payrollSheets, payrollRecords } from "../db/schema";
import { mysqlAvailable, openFixture, seed } from "./database-fixtures";
describe.skipIf(!mysqlAvailable)("真实 MySQL 工资约束", () => {
  it("合并密文字段允许为空、完整保存长内容，并移除三个旧列", async () => {
    const { connection, db } = await openFixture();
    try {
      await seed(connection);
      const [columns] = await connection.query<RowDataPacket[]>("SHOW COLUMNS FROM persons");
      expect(columns.find(column => column.Field === "sensitive_info")).toMatchObject({ Type: "text", Null: "YES" });
      for (const field of ["id_card_number", "salary_card_number", "phone"]) {
        expect(columns.some(column => column.Field === field)).toBe(false);
      }
      expect((await db.select().from(persons))[0].sensitiveInfo).toBeNull();
      // 仅验证存储契约，此处的长字符串不是实际加密结果。
      const payload = "模拟密文封装".repeat(100);
      await db.update(persons).set({ sensitiveInfo: payload }).where(eq(persons.id, 7));
      const [stored] = await db.select().from(persons);
      expect(stored.sensitiveInfo).toBe(payload);
      expect(stored.updatedAt.getTime()).toBeGreaterThan(1000);
      await db.update(persons).set({ sensitiveInfo: payload }).where(eq(persons.id, 7));
      expect((await db.select().from(persons))[0].updatedAt).toEqual(stored.updatedAt);
      await db.update(persons).set({ sensitiveInfo: null }).where(eq(persons.id, 7));
      const [cleared] = await db.select().from(persons);
      expect(cleared.sensitiveInfo).toBeNull();
      expect(cleared.updatedAt.getTime()).toBeGreaterThan(stored.updatedAt.getTime());
    } finally { await connection.end(); }
  });
  it("5.7 插入与更新触发器均拒绝非法输入，并填充毫秒时间", async () => {
    const { connection } = await openFixture();
    try {
      await seed(connection);
      for (const query of [
        "INSERT INTO persons(name,gender) VALUES ('新人员','男 ')",
        "INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (8,7,-1)",
        "INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (8,7,9007199254740992)",
        "UPDATE persons SET name=' '",
        "UPDATE payroll_sheets SET name=' '",
      ]) await expect(connection.query(query)).rejects.toMatchObject({ code: "ER_SIGNAL_EXCEPTION" });
      await connection.query("INSERT INTO persons(name) VALUES ('默认时间')");
      const [rows] = await connection.query<RowDataPacket[]>("SELECT created_at,updated_at,name_key FROM persons WHERE name='默认时间'");
      expect(Number(rows[0].created_at)).toBeGreaterThan(Date.now() - 60000);
      expect(rows[0].updated_at).toBe(rows[0].created_at);
      expect(rows[0].name_key.toString("utf8")).toBe("默认时间");
      await connection.query("UPDATE persons SET updated_at=9000000000000 WHERE id=7");
      await connection.query("UPDATE persons SET name=CONCAT(name,' ') WHERE id=7");
      const [changed] = await connection.query<RowDataPacket[]>("SELECT updated_at FROM persons WHERE id=7");
      expect(Number(changed[0].updated_at)).toBe(9000000000001);
    } finally { await connection.end(); }
  });
  it("金额、空白名称、唯一性、性别、字段长度和外键边界", async () => {
    const { connection } = await openFixture();
    try {
      await seed(connection);
      for (const amount of [-1, "9007199254740992"]) await expect(connection.query("UPDATE payroll_records SET actual_amount=?", [amount])).rejects.toThrow();
      for (const amount of [0, 1, 123456, Number.MAX_SAFE_INTEGER]) {
        await connection.query("UPDATE payroll_records SET actual_amount=?", [amount]);
        const [rows] = await connection.query<RowDataPacket[]>("SELECT actual_amount FROM payroll_records");
        expect(Number(rows[0].actual_amount)).toBe(amount);
      }
      for (const name of ["", " ", "\t", "\r\n", "\u00a0", "\u3000", " \t\r\n\u00a0\u3000"]) {
        for (const table of ["persons", "payroll_sheets"]) await expect(connection.query(`INSERT INTO ${table}(name) VALUES (?)`, [name])).rejects.toThrow();
      }
      for (const query of [
        "INSERT INTO persons(name) VALUES ('测试人员')",
        "INSERT INTO payroll_sheets(name) VALUES ('测试工资表')",
        "INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (8,7,100)",
        "UPDATE persons SET gender='未知'",
        "UPDATE payroll_records SET person_id=999",
        "UPDATE payroll_records SET payroll_sheet_id=999",
        "DELETE FROM persons WHERE id=7",
        "INSERT INTO persons(name) VALUES (REPEAT('人',101))",
      ]) await expect(connection.query(query)).rejects.toThrow();
      // 大小写和尾随空格不同，必须继续视作不同名称。
      for (const name of ["甲", "甲 ", "A", "a", " 正常姓名 "]) await connection.query("INSERT INTO persons(name) VALUES (?)", [name]);
    } finally { await connection.end(); }
  });
  it.each(["Drizzle", "直接 SQL"])("三表修改时间行为：%s", async mode => {
    const { connection, db } = await openFixture();
    try {
      await seed(connection);
      if (mode === "Drizzle") {
        await db.update(persons).set({ sensitiveInfo: "测试密文" }).where(eq(persons.id, 7));
        await db.update(payrollSheets).set({ name: "新名称" }).where(eq(payrollSheets.id, 8));
        await db.update(payrollRecords).set({ actualAmount: 500 }).where(eq(payrollRecords.id, 9));
        const person = await db.select().from(persons);
        expect(person[0].createdAt).toEqual(new Date(1000));
      } else {
        for (const query of ["UPDATE persons SET sensitive_info='测试密文'", "UPDATE payroll_sheets SET name='新名称'", "UPDATE payroll_records SET actual_amount=500"]) await connection.query(query);
      }
      for (const table of ["persons", "payroll_sheets", "payroll_records"]) {
        const [before] = await connection.query<RowDataPacket[]>(`SELECT created_at,updated_at FROM ${table}`);
        expect(Number(before[0].created_at)).toBe(1000);
        expect(Number(before[0].updated_at)).toBeGreaterThan(1000);
        const field = table === "payroll_records" ? "actual_amount" : "name";
        await connection.query(`UPDATE ${table} SET ${field}=${field}`);
        const [same] = await connection.query<RowDataPacket[]>(`SELECT updated_at FROM ${table}`);
        expect(same[0].updated_at).toBe(before[0].updated_at);
        await connection.query(`UPDATE ${table} SET updated_at=9000000000000`);
        await connection.query(table === "payroll_records" ? "UPDATE payroll_records SET actual_amount=501" : `UPDATE ${table} SET name='另一个名称'`);
        const [next] = await connection.query<RowDataPacket[]>(`SELECT updated_at FROM ${table}`);
        expect(Number(next[0].updated_at)).toBe(9000000000001);
      }
    } finally { await connection.end(); }
  });
  it("1000 条批量写入、事务回滚及重连持久化", async () => {
    const { connection, db, config } = await openFixture();
    try {
      await expect(db.transaction(async tx => {
        await tx.insert(persons).values({ name: "重复" });
        await tx.insert(persons).values({ name: "重复" });
      })).rejects.toThrow();
      expect(await db.select().from(persons)).toHaveLength(0);
      await db.transaction(async tx => {
        await tx.insert(persons).values(Array.from({ length: 1000 }, (_, i) => ({ name: "测试人员" + i })));
      });
      const mysql = await import("mysql2/promise");
      const reopened = await mysql.createConnection(config);
      try {
        const [rows] = await reopened.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM persons");
        expect(Number(rows[0].n)).toBe(1000);
      } finally { await reopened.end(); }
    } finally { await connection.end(); }
  });
});
