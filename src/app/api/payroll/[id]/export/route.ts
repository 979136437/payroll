import { NextResponse } from "next/server";
import { apiErrorResponse, parsePositiveInteger } from "@/lib/api-route";
import { exportPayrollSheetExcel } from "@/lib/services/excel.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sheetId = parsePositiveInteger(id);
    if (sheetId == null) {
      return NextResponse.json({ error: "工资表 ID 无效" }, { status: 400 });
    }
    const buffer = await exportPayrollSheetExcel(sheetId);
    const filename = `工资表_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: unknown) {
    return apiErrorResponse(error, "导出失败", {
      "未找到当前工资表": 404,
    });
  }
}
