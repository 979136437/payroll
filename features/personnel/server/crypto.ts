import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PersonnelError } from "./errors";

export interface SensitiveInfo { idCardNumber: string; salaryCardNumber: string; phone: string }

function key() {
  const encoded = process.env.PERSONNEL_ENCRYPTION_KEY ?? "";
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32 || value.toString("base64") !== encoded) {
    throw new PersonnelError("人员加密密钥未配置或格式错误，请联系管理员", 503);
  }
  return value;
}

export function encryptSensitive(value: SensitiveInfo) {
  // 每次独立随机 IV，避免相同资料产生相同密文；认证标签可检测篡改。
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") });
}

export function decryptSensitive(value: string | null): SensitiveInfo {
  const secret = key();
  if (!value) return { idCardNumber: "", salaryCardNumber: "", phone: "" };
  try {
    const envelope = JSON.parse(value);
    if (envelope.v !== 1) throw new Error();
    const iv = Buffer.from(envelope.iv, "base64");
    const tag = Buffer.from(envelope.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", secret, iv);
    decipher.setAuthTag(tag);
    const result = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]).toString("utf8"));
    if (![result.idCardNumber, result.salaryCardNumber, result.phone].every(item => typeof item === "string")) throw new Error();
    return { idCardNumber: result.idCardNumber, salaryCardNumber: result.salaryCardNumber, phone: result.phone };
  } catch {
    throw new PersonnelError("人员敏感资料解密失败，请检查密钥与数据", 503);
  }
}
