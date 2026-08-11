import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  isObjectRecord,
  parsePositiveInteger,
  readJsonBody,
} from "@/lib/api-route";
import {
  listPayrollSheets,
  createPayrollSheet,
} from "@/lib/services/payroll.service";

export async function GET() {
  try {
    const sheets = await listPayrollSheets();
    return NextResponse.json(sheets);
  } catch (error: unknown) {
    return apiErrorResponse(error, "获取工资表列表失败");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (!isObjectRecord(body) || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "工资表名称必须是字符串" },
        { status: 400 }
      );
    }
    const sourceSheetId =
      body.sourceSheetId == null
        ? null
        : parsePositiveInteger(body.sourceSheetId);
    if (body.sourceSheetId != null && sourceSheetId == null) {
      return NextResponse.json(
        { error: "来源工资表 ID 无效" },
        { status: 400 }
      );
    }
    const sheet = await createPayrollSheet({
      name: body.name,
      sourceSheetId,
    });
    return NextResponse.json(sheet);
  } catch (error: unknown) {
    return apiErrorResponse(error, "创建工资表失败", {
      "工资表名称不能为空": 400,
      "工资表名称已存在": 400,
    });
  }
}
