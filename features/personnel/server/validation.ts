import { z } from "zod";
import { PersonnelError } from "./errors";

const field = z.string({ error: "人员字段必须为文本" }).trim().max(100, "人员字段不能超过100个字符").refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), "不能包含控制字符");
export const personInput = z.object({
  name: field.min(1, "姓名不能为空"), gender: field, ethnicity: field, nativePlace: field,
  idCardNumber: field, salaryCardNumber: field, bankName: field, phone: field,
}, { error: "人员资料必须为对象" }).strict();
export type PersonInput = z.infer<typeof personInput>;
export function parsePerson(value: unknown) {
  const result = personInput.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new PersonnelError(issue?.code === "unrecognized_keys" ? "人员资料包含未知字段" : issue?.message ?? "人员资料格式错误");
  }
  return result.data;
}
export function parseId(value: unknown) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) throw new PersonnelError("人员编号无效");
  return Number(value);
}
export function parseIds(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 5000) throw new PersonnelError("请选择1至5000名人员");
  return [...new Set(value.map(parseId))];
}
export function parseQuery(url: URL) {
  const query = (url.searchParams.get("query") ?? "").trim();
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
  if (query.length > 100 || !Number.isSafeInteger(page) || page < 1 || ![5,10,20].includes(pageSize)) throw new PersonnelError("搜索或分页参数无效");
  return { query, page, pageSize };
}
