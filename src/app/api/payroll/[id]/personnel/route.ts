import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  isFiniteNumber,
  isPersonnelNetPayMap,
  isPositiveIntegerArray,
  parsePositiveInteger,
} from "@/lib/api-route";
import {
  addPersonnelToSheet,
  removePersonnelFromSheet,
} from "@/lib/services/payroll.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sheetId = parsePositiveInteger(id);
    if (sheetId == null) {
      return NextResponse.json({ error: "工资表 ID 无效" }, { status: 400 });
    }
    const body = await request.json();
    const { personnelIds, defaultNetPay, perPersonNetPay } = body;
    if (!isPositiveIntegerArray(personnelIds)) {
      return NextResponse.json(
        { error: "personnelIds 必须是正整数数组" },
        { status: 400 }
      );
    }
    if (defaultNetPay != null && !isFiniteNumber(defaultNetPay)) {
      return NextResponse.json(
        { error: "defaultNetPay 必须是有效数字" },
        { status: 400 }
      );
    }
    if (
      perPersonNetPay != null &&
      !isPersonnelNetPayMap(perPersonNetPay)
    ) {
      return NextResponse.json(
        { error: "perPersonNetPay 格式无效" },
        { status: 400 }
      );
    }
    await addPersonnelToSheet(sheetId, personnelIds, {
      defaultNetPay: defaultNetPay ?? undefined,
      perPersonNetPay:
        perPersonNetPay == null ? undefined : perPersonNetPay,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, "添加人员失败");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sheetId = parsePositiveInteger(id);
    if (sheetId == null) {
      return NextResponse.json({ error: "工资表 ID 无效" }, { status: 400 });
    }
    const body = await request.json();
    const { personnelIds } = body;
    if (!isPositiveIntegerArray(personnelIds)) {
      return NextResponse.json(
        { error: "personnelIds 必须是正整数数组" },
        { status: 400 }
      );
    }
    await removePersonnelFromSheet(sheetId, personnelIds);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, "移除工员失败");
  }
}
