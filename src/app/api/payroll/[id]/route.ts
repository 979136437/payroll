import { NextResponse } from "next/server";
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
    const detail = await getPayrollSheetDetail(Number(id));
    if (!detail) {
      return NextResponse.json({ error: "工资表不存在" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "获取工资表详情失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deletePayrollSheet(Number(id));
    if (!result.deleted) {
      return NextResponse.json({ error: "工资表不存在" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除工资表失败" },
      { status: 500 }
    );
  }
}
