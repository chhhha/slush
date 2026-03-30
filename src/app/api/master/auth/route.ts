import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/master/auth
 * 마스터(슈퍼 관리자) 6자리 PIN 인증.
 * 성공 시 세션 쿠키(master_authed)를 설정한다.
 */
export async function POST(req: NextRequest) {
  const { pin } = (await req.json()) as { pin?: string };

  if (!pin || pin !== process.env.MASTER_PIN) {
    return NextResponse.json(
      { success: false, error: "PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("master_authed", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 세션 쿠키 — 브라우저 종료 시 삭제
  });
  return res;
}
