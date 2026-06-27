import { NextResponse } from "next/server";
import {
  addPersonnelToSheet,
  removePersonnelFromSheet,
} from "@/lib/services/payroll.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { personnelIds, defaultNetPay, perPersonNetPay } = body;
    if (!Array.isArray(personnelIds)) {
      return NextResponse.json(
        { error: "personnelIds 必须是数组" },
        { status: 400 }
      );
    }
    await addPersonnelToSheet(Number(id), personnelIds, {
      defaultNetPay: defaultNetPay != null ? Number(defaultNetPay) : undefined,
      perPersonNetPay: perPersonNetPay || undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "添加人员失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { personnelIds } = body;
    if (!Array.isArray(personnelIds)) {
      return NextResponse.json(
        { error: "personnelIds 必须是数组" },
        { status: 400 }
      );
    }
    await removePersonnelFromSheet(Number(id), personnelIds);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "移除工员失败" },
      { status: 500 }
    );
  }
}
