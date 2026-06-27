import { NextResponse } from "next/server";
import { listPersonnel, createPersonnel } from "@/lib/services/personnel.service";

export async function GET() {
  try {
    const personnel = await listPersonnel();
    return NextResponse.json(personnel);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "获取人员列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personnel = await createPersonnel(body);
    return NextResponse.json(personnel);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "创建人员失败" },
      { status: 400 }
    );
  }
}
