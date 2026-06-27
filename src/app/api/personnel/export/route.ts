import { NextResponse } from "next/server";
import { exportPersonnelExcel } from "@/lib/services/excel.service";

export async function GET() {
  try {
    const buffer = await exportPersonnelExcel();
    const filename = `花名册_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "导出失败" },
      { status: 500 }
    );
  }
}
