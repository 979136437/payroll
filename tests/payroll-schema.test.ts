import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { persons, payrollSheets, payrollRecords } from "../db/schema";
import { describeDatabaseError } from "../scripts/migrations";
import { fixtureFolder, migrationFolder, openFixture, seed } from "./database-fixtures";

describe("真实工资迁移与约束", () => {
  it("空表也保留已有自增序列，表替换后的 SQL 失败回滚整个升级", () => {
    const { connection, db } = openFixture(true);
    try {
      connection.exec("INSERT INTO sqlite_sequence(name,seq) VALUES ('persons',200),('payroll_sheets',200),('payroll_records',200)");
      const before = connection.serialize();
      const broken = fixtureFolder();
      appendFileSync(join(broken, "0001_payroll_integrity.sql"), "\n--> statement-breakpoint\nSELECT * FROM missing_failure_probe;\n");
      expect(() => migrate(db, { migrationsFolder: broken })).toThrow();
      expect(connection.serialize()).toEqual(before);
      migrate(db, { migrationsFolder: migrationFolder });
      expect(connection.prepare("INSERT INTO persons(name) VALUES ('新人员')").run().lastInsertRowid).toBe(201);
      expect(connection.prepare("INSERT INTO payroll_sheets(name) VALUES ('新工资表')").run().lastInsertRowid).toBe(201);
      expect(connection.prepare("INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (201,201,0)").run().lastInsertRowid).toBe(201);
    } finally { connection.close(); }
  });
  it("初始库带数据升级保留记录、索引、关联与自增序列，重复执行无变化", () => {
    const { connection, db } = openFixture(true);
    try {
      seed(connection);
      connection.exec("UPDATE sqlite_sequence SET seq=100 WHERE name IN ('persons','payroll_sheets','payroll_records')");
      const tables = ["persons", "payroll_sheets", "payroll_records"];
      const before = tables.map(table => connection.prepare(`SELECT * FROM ${table}`).all());
      migrate(db, { migrationsFolder: migrationFolder });
      migrate(db, { migrationsFolder: migrationFolder });
      expect(tables.map(table => connection.prepare(`SELECT * FROM ${table}`).all())).toEqual(before);
      expect(connection.pragma("foreign_key_check")).toEqual([]);
      expect(connection.prepare("SELECT count(*) AS n FROM __drizzle_migrations").get()).toEqual({ n: 2 });
      expect(connection.prepare("INSERT INTO persons(name) VALUES ('新人员')").run().lastInsertRowid).toBe(101);
      expect(connection.prepare("INSERT INTO payroll_sheets(name) VALUES ('新工资表')").run().lastInsertRowid).toBe(101);
      expect(connection.prepare("INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (101,101,0)").run().lastInsertRowid).toBe(101);
    } finally { connection.close(); }
  });

  it.each([1.5, "abc", -1, 9007199254740992])("拒绝非法金额 %s", amount => {
    const { connection } = openFixture();
    try {
      seed(connection);
      expect(() => connection.prepare("UPDATE payroll_records SET actual_amount=?").run(amount)).toThrow(/CHECK/);
    } finally { connection.close(); }
  });

  it.each([0, 1, 123456, Number.MAX_SAFE_INTEGER])("接受整数分金额 %s", amount => {
    const { connection } = openFixture();
    try {
      seed(connection);
      connection.prepare("UPDATE payroll_records SET actual_amount=?").run(amount);
      expect(connection.prepare("SELECT actual_amount FROM payroll_records").get()).toEqual({ actual_amount: amount });
    } finally { connection.close(); }
  });

  it.each(["", " ", "\t", "\r\n", "\u00a0", "\u3000", " \t\r\n\u00a0\u3000"])("拒绝空白名称 %j", name => {
    const { connection } = openFixture();
    try {
      for (const table of ["persons", "payroll_sheets"]) expect(() => connection.prepare(`INSERT INTO ${table}(name) VALUES (?)`).run(name)).toThrow(/CHECK/);
    } finally { connection.close(); }
  });

  it("原有唯一性、性别及外键限制继续有效", () => {
    const { connection } = openFixture();
    try {
      seed(connection);
      for (const sql of ["INSERT INTO persons(name) VALUES ('测试人员')", "INSERT INTO payroll_sheets(name) VALUES ('测试工资表')", "INSERT INTO payroll_records(payroll_sheet_id,person_id,actual_amount) VALUES (8,7,100)"]) expect(() => connection.exec(sql)).toThrow(/UNIQUE/);
      expect(() => connection.exec("UPDATE persons SET gender='未知'")).toThrow(/CHECK/);
      expect(() => connection.exec("UPDATE payroll_records SET person_id=999")).toThrow(/FOREIGN KEY/);
      expect(() => connection.exec("UPDATE payroll_records SET payroll_sheet_id=999")).toThrow(/FOREIGN KEY/);
      connection.prepare("INSERT INTO persons(name) VALUES (?)").run(" 正常姓名 ");
      expect(connection.prepare("SELECT name FROM persons WHERE id != 7").get()).toEqual({ name: " 正常姓名 " });
    } finally { connection.close(); }
  });

  it.each(["金额", "人员名称", "工资表名称", "关联"])("非法旧数据阻止升级且事务回滚：%s", kind => {
    const { connection, db } = openFixture(true);
    try {
      seed(connection);
      if (kind === "金额") connection.exec("UPDATE payroll_records SET actual_amount='敏感测试值'");
      if (kind === "人员名称") connection.exec("UPDATE persons SET name=' '");
      if (kind === "工资表名称") connection.exec("UPDATE payroll_sheets SET name=' '");
      if (kind === "关联") { connection.pragma("foreign_keys=OFF"); connection.exec("UPDATE payroll_records SET person_id=999"); connection.pragma("foreign_keys=ON"); }
      const before = connection.serialize();
      let caught: unknown;
      try { migrate(db, { migrationsFolder: migrationFolder }); } catch (error) { caught = error; }
      expect(caught).toBeDefined();
      expect(describeDatabaseError(caught)).toContain(kind === "金额" ? "旧数据金额无效" : kind === "关联" ? "旧数据关联无效" : "旧数据名称无效");
      expect(describeDatabaseError(caught)).not.toContain("敏感测试值");
      expect(connection.serialize()).toEqual(before);
      expect(connection.prepare("SELECT count(*) AS n FROM sqlite_temp_master").get()).toEqual({ n: 0 });
    } finally { connection.close(); }
  });
});

describe("数据库触发器维护修改时间", () => {
  it.each(["Drizzle", "直接 SQL"])("三表实际修改更新时间、保留创建时间且不递归：%s", mode => {
    const { connection, db } = openFixture();
    try {
      seed(connection);
      if (mode === "Drizzle") {
        db.update(persons).set({ phone: "测试电话" }).where(eq(persons.id, 7)).run();
        db.update(payrollSheets).set({ name: "新名称" }).where(eq(payrollSheets.id, 8)).run();
        db.update(payrollRecords).set({ actualAmount: 500 }).where(eq(payrollRecords.id, 9)).run();
      } else {
        connection.exec("UPDATE persons SET phone='测试电话'; UPDATE payroll_sheets SET name='新名称'; UPDATE payroll_records SET actual_amount=500;");
      }
      for (const table of ["persons", "payroll_sheets", "payroll_records"]) {
        const before = connection.prepare(`SELECT created_at,updated_at,typeof(updated_at) AS kind FROM ${table}`).get() as { created_at: number; updated_at: number; kind: string };
        expect(before.created_at).toBe(1000);
        expect(before.updated_at).toBeGreaterThan(1000);
        expect(before.kind).toBe("integer");
        const field = table === "payroll_records" ? "actual_amount" : "name";
        connection.exec(`UPDATE ${table} SET ${field}=${field}`);
        expect(connection.prepare(`SELECT updated_at FROM ${table}`).get()).toEqual({ updated_at: before.updated_at });
        connection.exec(`UPDATE ${table} SET updated_at=2000`);
        expect(connection.prepare(`SELECT updated_at FROM ${table}`).get()).toEqual({ updated_at: 2000 });
      }
    } finally { connection.close(); }
  });
});
