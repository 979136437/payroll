import { NextResponse } from "next/server";
import { apiErrorResponse, parsePositiveInteger } from "@/lib/api-route";
import { updatePayrollRecordExportWeight } from "@/lib/services/payroll.service";

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
    const body = await request.json();
    const { exportWeight } = body;
    if (
      exportWeight != null &&
      (!Number.isSafeInteger(exportWeight) || exportWeight < 0)
    ) {
      return NextResponse.json(
        { error: "exportWeight 必须是非负整数或 null" },
        { status: 400 }
      );
    }
    const result = await updatePayrollRecordExportWeight(
      recordId,
      exportWeight ?? null
    );
    if (!result) {
      return NextResponse.json(
        { error: "工资记录不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiErrorResponse(error, "更新导出权重失败");
  }
}
