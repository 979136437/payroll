import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  isPersonnelInput,
  parsePositiveInteger,
  PERSONNEL_INPUT_ERROR,
} from "@/lib/api-route";
import {
  getPersonnelById,
  updatePersonnel,
  deletePersonnel,
} from "@/lib/services/personnel.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personnelId = parsePositiveInteger(id);
    if (personnelId == null) {
      return NextResponse.json({ error: "人员 ID 无效" }, { status: 400 });
    }
    const personnel = await getPersonnelById(personnelId);
    if (!personnel) {
      return NextResponse.json({ error: "人员不存在" }, { status: 404 });
    }
    return NextResponse.json(personnel);
  } catch (error: unknown) {
    return apiErrorResponse(error, "获取人员信息失败");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personnelId = parsePositiveInteger(id);
    if (personnelId == null) {
      return NextResponse.json({ error: "人员 ID 无效" }, { status: 400 });
    }
    const body = await request.json();
    if (!isPersonnelInput(body)) {
      return NextResponse.json({ error: PERSONNEL_INPUT_ERROR }, { status: 400 });
    }
    const result = await updatePersonnel(personnelId, body);
    if (!result) {
      return NextResponse.json({ error: "人员不存在" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiErrorResponse(error, "更新人员失败", {
      "姓名不能为空": 400,
      "身份证号码已存在": 400,
    });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personnelId = parsePositiveInteger(id);
    if (personnelId == null) {
      return NextResponse.json({ error: "人员 ID 无效" }, { status: 400 });
    }
    const deleted = await deletePersonnel(personnelId);
    if (!deleted) {
      return NextResponse.json({ error: "人员不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return apiErrorResponse(error, "删除人员失败");
  }
}
