import { NextResponse } from "next/server";
import { deletePersonnelBatch } from "@/lib/services/personnel.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;
    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids 必须是数组" },
        { status: 400 }
      );
    }
    const result = await deletePersonnelBatch(ids);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "批量删除失败" },
      { status: 500 }
    );
  }
}
