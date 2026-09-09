import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

export function readDbConfig(env: Record<string, string | undefined> = process.env) {
  // 固定临时路径可跨进程复用；不能每次启动都生成一个新的数据库。
  if (env.NODE_ENV === "development") {
    return { filename: join(tmpdir(), "payroll", "payroll.sqlite") };
  }
  if (env.NODE_ENV !== "production" && env.NODE_ENV !== "test") {
    throw new Error("必须明确指定数据库运行环境");
  }
  const filename = env.DB_FILE;
  // 生产和测试必须明确提供文件路径，禁止悄悄回退到开发库或内存库。
  if (!filename || !filename.trim() || filename.includes("\0") || !isAbsolute(filename)) {
    throw new Error("数据库配置 DB_FILE 必须是非空的绝对文件路径");
  }
  if (!filename.endsWith(".sqlite")) throw new Error("数据库文件必须使用 .sqlite 扩展名");
  return { filename };
}

