import { NextResponse } from "next/server";
import { apiErrorResponse, isPositiveIntegerArray } from "@/lib/api-route";
import { deletePersonnelBatch } from "@/lib/services/personnel.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;
    if (!isPositiveIntegerArray(ids)) {
      return NextResponse.json(
        { error: "ids 必须是正整数数组" },
        { status: 400 }
      );
    }
    const result = await deletePersonnelBatch(ids);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiErrorResponse(error, "批量删除失败");
  }
}
