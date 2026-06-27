import { NextResponse } from "next/server";
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
    const personnel = await getPersonnelById(Number(id));
    if (!personnel) {
      return NextResponse.json({ error: "人员不存在" }, { status: 404 });
    }
    return NextResponse.json(personnel);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "获取人员信息失败" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updatePersonnel(Number(id), body);
    if (!result) {
      return NextResponse.json({ error: "人员不存在" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新人员失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deletePersonnel(Number(id));
    if (!deleted) {
      return NextResponse.json({ error: "人员不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除人员失败" },
      { status: 500 }
    );
  }
}
