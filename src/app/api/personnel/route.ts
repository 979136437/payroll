import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  isPersonnelInput,
  PERSONNEL_INPUT_ERROR,
} from "@/lib/api-route";
import { listPersonnel, createPersonnel } from "@/lib/services/personnel.service";

export async function GET() {
  try {
    const personnel = await listPersonnel();
    return NextResponse.json(personnel);
  } catch (error: unknown) {
    return apiErrorResponse(error, "获取人员列表失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isPersonnelInput(body)) {
      return NextResponse.json({ error: PERSONNEL_INPUT_ERROR }, { status: 400 });
    }
    const personnel = await createPersonnel(body);
    return NextResponse.json(personnel);
  } catch (error: unknown) {
    return apiErrorResponse(error, "创建人员失败", {
      "姓名不能为空": 400,
      "身份证号码已存在": 400,
    });
  }
}
