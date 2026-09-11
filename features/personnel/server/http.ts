import { PersonnelError } from "./errors";

const corsOrigins = new Set([
  "https://payroll-86556-7-1303242491.sh.run.tcloudbase.com",
]);

export async function handle(operation: () => Promise<Response>) {
  try {
    const response = await operation();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    let failure = error instanceof PersonnelError ? error : new PersonnelError("操作失败，请稍后重试", 500);
    let cause: unknown = error;
    for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth++) {
      const item = cause as { code?: string; cause?: unknown };
      if (item.code === "ER_DUP_ENTRY") failure = new PersonnelError("姓名已存在，请刷新后检查重名人员；本次操作未写入", 409);
      if (item.code === "ER_ROW_IS_REFERENCED_2") failure = new PersonnelError("选中人员存在关联工资记录，整批删除已取消", 409);
      cause = item.cause;
    }
    return Response.json({ message: failure.message, issues: failure.issues }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // 没有 Origin 的请求（非浏览器请求）
  if (!origin) {
    throw new PersonnelError("请求必须包含 Origin", 400);
  }

  const sameOrigin =
    origin === new URL(request.url).origin;

  const allowedOrigin =
    corsOrigins.has(origin);

  if (!sameOrigin && !allowedOrigin) {
    throw new PersonnelError(
      "不允许跨站提交",
      403
    );
  }
}
export async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw new PersonnelError("请求内容超出大小限制", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PersonnelError("请求内容为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new PersonnelError("请求内容超出大小限制", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request) {
  checkOrigin(request);
  const body = await readBody(request, 128 * 1024);
  try { return JSON.parse(body.toString("utf8")); }
  catch { throw new PersonnelError("请求必须是有效JSON"); }
}
