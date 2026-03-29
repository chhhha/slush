import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, createAdminToken, setAdminCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = await verifyAdminToken();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "인증 만료" },
      { status: 401 },
    );
  }

  try {
    const { name } = await request.json();
    const trimmed = (name as string)?.trim();
    if (!trimmed || trimmed.length > 20) {
      return NextResponse.json(
        { success: false, error: "이름이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const token = await createAdminToken(trimmed);
    await setAdminCookie(token);
    return NextResponse.json({ success: true, name: trimmed });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
