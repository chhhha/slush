import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

export async function GET() {
  const admin = await verifyAdminToken();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "인증 만료" },
      { status: 401 },
    );
  }
  return NextResponse.json({ success: true, name: admin.name, role: admin.role });
}
