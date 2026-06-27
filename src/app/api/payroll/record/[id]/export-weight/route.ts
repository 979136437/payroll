import { NextResponse } from "next/server";
import { updatePayrollRecordExportWeight } from "@/lib/services/payroll.service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { exportWeight } = body;
    const result = await updatePayrollRecordExportWeight(
      Number(id),
      exportWeight != null ? Number(exportWeight) : null
    );
    if (!result) {
      return NextResponse.json(
        { error: "工资记录不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新导出权重失败" },
      { status: 500 }
    );
  }
}
