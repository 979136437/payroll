import { NextResponse } from "next/server";
import {
  listPayrollSheets,
  createPayrollSheet,
} from "@/lib/services/payroll.service";

export async function GET() {
  try {
    const sheets = await listPayrollSheets();
    return NextResponse.json(sheets);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "获取工资表列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheet = await createPayrollSheet(body);
    return NextResponse.json(sheet);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "创建工资表失败" },
      { status: 400 }
    );
  }
}
