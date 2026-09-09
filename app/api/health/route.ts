import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 容器就绪检查同时验证原生 SQLite 驱动与持久卷权限，不公开数据或内部路径。
export function GET() {
  try {
    getDb().get(sql`SELECT 1`);
    return Response.json({ status: "正常" });
  } catch {
    return Response.json({ status: "数据库不可用" }, { status: 503 });
  }
}
