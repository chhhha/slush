import { NextRequest, NextResponse } from "next/server";
import { pinSchema } from "@/lib/validations";
import { createAdminToken, setAdminCookie } from "@/lib/auth";
import {
  checkRateLimit,
  getFailureStatus,
  recordFailure,
  recordSuccess,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { pin, name, deviceId } = parsed.data;

    // Rate limit 확인
    const limit = checkRateLimit(deviceId);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            limit.reason === "global"
              ? "잠시 후 다시 시도해주세요"
              : `너무 많은 시도가 있었습니다. ${limit.retryAfterSeconds}초 후 다시 시도해주세요`,
          retryAfterSeconds: limit.retryAfterSeconds,
          failCount: limit.failCount,
          remainingAttempts: limit.remainingAttempts,
        },
        { status: 429 }
      );
    }

    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) {
      return NextResponse.json(
        { success: false, error: "서버 설정 오류" },
        { status: 500 }
      );
    }

    if (pin !== adminPin) {
      recordFailure(deviceId);
      const status = getFailureStatus(deviceId);
      return NextResponse.json(
        {
          success: false,
          error: "PIN이 올바르지 않습니다",
          failCount: status.failCount,
          remainingAttempts: status.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 관리자 로그인 강화 모드 확인
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from("site_settings")
      .select("admin_login_strict")
      .eq("id", "global")
      .single();

    if (settings?.admin_login_strict) {
      const { data: allowed } = await supabase
        .from("admin_allowed_names")
        .select("id")
        .eq("name", name)
        .single();

      if (!allowed) {
        recordFailure(deviceId);
        const status = getFailureStatus(deviceId);
        return NextResponse.json(
          {
            success: false,
            error: "등록되지 않은 이름입니다",
            failCount: status.failCount,
            remainingAttempts: status.remainingAttempts,
          },
          { status: 403 }
        );
      }
    }

    recordSuccess(deviceId);
    const token = await createAdminToken(name);
    await setAdminCookie(token);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
