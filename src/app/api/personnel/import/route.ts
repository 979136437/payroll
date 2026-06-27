import { NextResponse } from "next/server";
import { importPersonnelFromExcel } from "@/lib/services/excel.service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importPersonnelFromExcel(buffer);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "导入失败" },
      { status: 500 }
    );
  }
}
