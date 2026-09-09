import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Database from "better-sqlite3";
import { z } from "zod";

export class DatabaseOperationError extends Error {
  constructor(public readonly category: string, message: string) { super(message); }
}

const journalSchema = z.object({
  version: z.literal("7"), dialect: z.literal("sqlite"),
  entries: z.array(z.object({
    idx: z.number().int().nonnegative(), version: z.literal("6"),
    when: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    tag: z.string().regex(/^[a-zA-Z0-9_-]+$/), breakpoints: z.boolean(),
  })).min(1),
});

export function readMigrationHistory(folder: string) {
  try {
    const journal = journalSchema.parse(JSON.parse(readFileSync(resolve(folder, "meta/_journal.json"), "utf8")));
    const tags = new Set<string>();
    return journal.entries.map((entry, index) => {
      if (entry.idx !== index || tags.has(entry.tag) || (index > 0 && entry.when <= journal.entries[index - 1].when)) {
        throw new Error("迁移顺序无效");
      }
      tags.add(entry.tag);
      const sql = readFileSync(resolve(folder, entry.tag + ".sql"), "utf8");
      if (!sql.trim()) throw new Error("迁移 SQL 为空");
      return { ...entry, hash: createHash("sha256").update(sql).digest("hex") };
    });
  } catch {
    // 不转发文件系统和解析器原始错误，避免暴露绝对路径或文件内容。
    throw new DatabaseOperationError("迁移文件无效", "请检查迁移目录、日志格式、顺序及引用的 SQL 文件是否完整且非空");
  }
}

export function inspectMigrationState(connection: Database.Database, history: ReturnType<typeof readMigrationHistory>) {
  const tables = new Set((connection.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(row => row.name));
  const applied = tables.has("__drizzle_migrations")
    ? connection.prepare("SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at").all() as { hash: string; created_at: number }[]
    : [];
  // 已应用历史必须是本地历史的完整前缀，不能只比较最后一次时间戳。
  if (applied.length > history.length || applied.some((row, index) => row.created_at !== history[index].when || row.hash !== history[index].hash)) {
    throw new DatabaseOperationError("迁移历史不一致", "请核对部署版本和迁移文件；不得改写已应用的历史");
  }
  if (applied.length > 0 && ["persons", "payroll_sheets", "payroll_records"].some(name => !tables.has(name))) {
    throw new DatabaseOperationError("业务表缺失", "请检查数据库是否完整，并从受控备份恢复；不要重写迁移记录");
  }
  return { applied: applied.length, pending: history.length - applied.length };
}

export function describeDatabaseError(error: unknown): string {
  if (error instanceof DatabaseOperationError) return `类别：${error.category}；${error.message}`;
  // 仅匹配固定标识和错误码，不直接记录 SQL、绑定参数或底层错误文本。
  const causes: unknown[] = [error];
  for (let index = 0; index < causes.length && index < 5; index++) {
    const current = causes[index];
    if (!(current instanceof Error)) continue;
    if (current.message.includes("payroll_upgrade_invalid_amount")) return "类别：旧数据金额无效；请先人工核对非整数、负数或超出安全范围的金额";
    if (current.message.includes("payroll_upgrade_invalid_name")) return "类别：旧数据名称无效；请先人工核对空白人员姓名或工资表名称";
    if (current.message.includes("payroll_upgrade_invalid_relation")) return "类别：旧数据关联无效；请先核对人员与工资表关联";
    const code = (current as Error & { code?: string }).code;
    if (code === "SQLITE_BUSY" || code === "SQLITE_LOCKED") return "类别：数据库占用；请停止并发写入后重试";
    if (["SQLITE_CANTOPEN", "SQLITE_READONLY", "EACCES", "EPERM", "ENOENT"].includes(code ?? "")) return "类别：文件访问失败；请检查数据库是否存在、配置路径和目录权限";
    if (code?.startsWith("SQLITE_CONSTRAINT")) return "类别：约束冲突；请核对数据约束，当前迁移事务已回滚";
    if (current.cause) causes.push(current.cause);
  }
  return "类别：配置或执行失败；请核对命令参数、环境文件、DB_FILE 和迁移 SQL；未输出底层敏感详情";
}
