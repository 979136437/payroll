import { checkDatabase } from "@/db/client";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 只表示数据库连通性；业务迁移状态由发布前的独立命令检查。
export async function GET() {
  try {
    await checkDatabase();
    return Response.json({ status: "正常" });
  } catch {
    return Response.json({ status: "数据库不可用" }, { status: 503 });
  }
}