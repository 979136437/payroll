import { NextResponse } from "next/server";
import { reorderPersonnel } from "@/lib/services/personnel.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderedIds } = body;
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds 必须是数组" },
        { status: 400 }
      );
    }
    await reorderPersonnel(orderedIds);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "排序失败" },
      { status: 500 }
    );
  }
}
