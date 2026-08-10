import { NextResponse } from "next/server";
import { apiErrorResponse, isPositiveIntegerArray } from "@/lib/api-route";
import {
  PERSONNEL_REORDER_INPUT_ERROR,
  reorderPersonnel,
} from "@/lib/services/personnel.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderedIds } = body;
    if (!isPositiveIntegerArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds 必须是正整数数组" },
        { status: 400 }
      );
    }
    await reorderPersonnel(orderedIds);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, "排序失败", {
      [PERSONNEL_REORDER_INPUT_ERROR]: 400,
    });
  }
}
