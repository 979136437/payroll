import { NextResponse } from "next/server";
import { updatePayrollRecordNetPay } from "@/lib/services/payroll.service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { netPay } = body;
    if (netPay == null) {
      return NextResponse.json(
        { error: "netPay 不能为空" },
        { status: 400 }
      );
    }
    const result = await updatePayrollRecordNetPay(Number(id), netPay);
    if (!result) {
      return NextResponse.json(
        { error: "工资记录不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新净工资失败" },
      { status: 500 }
    );
  }
}
