import { NextResponse } from "next/server";
import { apiErrorResponse, parsePositiveInteger } from "@/lib/api-route";
import {
  getPayrollSheetDetail,
  deletePayrollSheet,
} from "@/lib/services/payroll.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sheetId = parsePositiveInteger(id);
    if (sheetId == null) {
      return NextResponse.json({ error: "工资表 ID 无效" }, { status: 400 });
    }
    const detail = await getPayrollSheetDetail(sheetId);
    if (!detail) {
      return NextResponse.json({ error: "工资表不存在" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error: unknown) {
    return apiErrorResponse(error, "获取工资表详情失败");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sheetId = parsePositiveInteger(id);
    if (sheetId == null) {
      return NextResponse.json({ error: "工资表 ID 无效" }, { status: 400 });
    }
    const result = await deletePayrollSheet(sheetId);
    if (!result.deleted) {
      return NextResponse.json({ error: "工资表不存在" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiErrorResponse(error, "删除工资表失败");
  }
}
