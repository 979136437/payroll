import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  isFiniteNumber,
  isObjectRecord,
  parsePositiveInteger,
  readJsonBody,
} from "@/lib/api-route";
import { updatePayrollRecordNetPay } from "@/lib/services/payroll.service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recordId = parsePositiveInteger(id);
    if (recordId == null) {
      return NextResponse.json({ error: "工资记录 ID 无效" }, { status: 400 });
    }
    const body = await readJsonBody(request);
    const netPay = isObjectRecord(body) ? body.netPay : undefined;
    if (!isFiniteNumber(netPay)) {
      return NextResponse.json(
        { error: "netPay 必须是有效数字" },
        { status: 400 }
      );
    }
    const result = await updatePayrollRecordNetPay(recordId, netPay);
    if (!result) {
      return NextResponse.json(
        { error: "工资记录不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiErrorResponse(error, "更新净工资失败");
  }
}
