import { NextResponse } from "next/server";
import type { CreatePersonnelInput } from "@/lib/types";

type KnownErrorStatus = Readonly<Record<string, number>>;

export const MAX_EXCEL_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_EXCEL_IMPORT_REQUEST_BYTES = 11 * 1024 * 1024;
export const PERSONNEL_INPUT_ERROR = "人员字段必须是字符串或 null";

const OPTIONAL_PERSONNEL_FIELDS = [
  "gender",
  "ethnicity",
  "nativePlace",
  "idCardNumber",
  "payrollCardNumber",
  "bankName",
  "jobType",
  "startDate",
  "endDate",
  "phoneNumber",
  "remark",
] as const;

export function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isPositiveIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isSafeInteger(item) && item > 0)
  );
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPersonnelInput(
  value: unknown
): value is CreatePersonnelInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Record<string, unknown>;
  return (
    typeof input.name === "string" &&
    OPTIONAL_PERSONNEL_FIELDS.every(
      (field) => input[field] == null || typeof input[field] === "string"
    )
  );
}

export function isPersonnelNetPayMap(
  value: unknown
): value is Record<number, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([personnelId, netPay]) =>
        parsePositiveInteger(personnelId) != null && isFiniteNumber(netPay)
    )
  );
}

export function apiErrorResponse(
  error: unknown,
  fallbackMessage: string,
  knownErrors: KnownErrorStatus = {}
) {
  const message = error instanceof Error ? error.message : "";
  const knownStatus = knownErrors[message];
  if (knownStatus !== undefined) {
    return NextResponse.json({ error: message }, { status: knownStatus });
  }

  // 保留服务端诊断信息，同时避免向客户端泄露数据库和文件路径细节。
  console.error(`[API] ${fallbackMessage}`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
