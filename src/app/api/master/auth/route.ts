import { NextRequest, NextResponse } from "next/server";
import { createMasterToken, setMasterCookie } from "@/lib/master-guard";
import { timingSafeEqual } from "crypto";

/**
 * POST /api/master/auth
 * 마스터(슈퍼 관리자) PIN 인증.
 * 성공 시 서명된 JWT 토큰을 쿠키로 설정한다.
 */
export async function POST(req: NextRequest) {
  const { pin } = (await req.json()) as { pin?: string };

  const masterPin = process.env.MASTER_PIN || "";

  // timing-safe 비교 (타이밍 사이드 채널 공격 방지)
  let isValid = false;
  try {
    if (pin && pin.length === masterPin.length) {
      isValid = timingSafeEqual(
        Buffer.from(pin),
        Buffer.from(masterPin)
      );
    }
  } catch {
    // timingSafeEqual이 길이 불일치로 throw하면 무시
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "PIN이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = await createMasterToken();
  await setMasterCookie(token);

  return NextResponse.json({ success: true });
}
