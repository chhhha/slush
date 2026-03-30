import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/auth";
import { reportSoldOutSchema } from "@/lib/validations";
import { COOLDOWN_CONFIG } from "@/lib/constants";
import type { ApiResponse } from "@/types";

const COOKIE_NAME = "slush_sid";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년

/**
 * POST /api/machines/[id]/report-soldout
 * 직원 일시품절 신고 API.
 *
 * 처리 순서:
 * 1. body에서 deviceId, fingerprint 추출 + IP 추출
 * 2. HttpOnly cookie(slush_sid) 읽기/생성
 * 3. Shadow ban 체크: banned_identifiers에 매칭되는 식별자가 있으면 일반 오류 반환
 * 4. 쿨다운 체크: device_id OR cookie_id로 1시간 이내 기록 있으면 429
 * 5. machine status='available' 확인
 * 6. UPDATE machines SET status='sold_out'
 * 7. status_logs INSERT
 * 8. abuse_records INSERT (모든 식별자 기록)
 * 9. 이메일 알림 fire-and-forget
 * 10. HttpOnly cookie 설정 후 응답
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;

  // body 파싱 및 유효성 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "잘못된 요청 형식입니다." }, 400);
  }

  const parsed = reportSoldOutSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { success: false, error: "요청 데이터가 유효하지 않습니다." },
      400
    );
  }

  const { deviceId, fingerprint } = parsed.data;

  // IP 주소 추출
  const ipAddress =
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  // HttpOnly cookie 읽기/생성
  const existingCookieId = req.cookies.get(COOKIE_NAME)?.value;
  const cookieId = existingCookieId ?? crypto.randomUUID();

  const supabase = createAdminClient();

  // 품절 제보 기능 활성 여부 확인
  const { data: settings } = await supabase
    .from("site_settings")
    .select("report_soldout_enabled")
    .eq("id", "global")
    .single();

  if (settings && !settings.report_soldout_enabled) {
    return jsonWithCookie(
      { success: false, error: "품절 제보 기능이 일시 중지되었습니다." },
      403,
      cookieId,
    );
  }

  // 관리자 세션 확인 (관리자는 쿨다운/ban 체크 생략)
  const admin = await verifyAdminToken();
  const isAdmin = admin !== null;

  // 관리자가 아닌 경우에만 ban/쿨다운 체크
  if (!isAdmin) {
    // 1. Shadow ban 체크 (차단 사실을 알리지 않음)
    const identifiers: { type: "device_id" | "ip_address" | "fingerprint" | "cookie_id"; value: string }[] = [
      { type: "device_id", value: deviceId },
      { type: "ip_address", value: ipAddress },
      { type: "fingerprint", value: fingerprint },
      { type: "cookie_id", value: cookieId },
    ];

    const banResults = await Promise.all(
      identifiers.map(({ type, value }) =>
        supabase
          .from("banned_identifiers")
          .select("*", { count: "exact", head: true })
          .eq("identifier_type", type)
          .eq("identifier_value", value)
      )
    );

    if (banResults.some(({ count }) => (count ?? 0) > 0)) {
      return jsonWithCookie(
        { success: false, error: "요청을 처리할 수 없습니다." },
        400,
        cookieId
      );
    }

    // 2. 쿨다운 체크 (device_id OR cookie_id 기준, 1시간)
    const cooldownStart = new Date(
      Date.now() - COOLDOWN_CONFIG.COOLDOWN_MINUTES * 60_000
    ).toISOString();

    const cooldownResults = await Promise.all([
      supabase
        .from("abuse_records")
        .select("*", { count: "exact", head: true })
        .gte("reported_at", cooldownStart)
        .eq("device_id", deviceId),
      supabase
        .from("abuse_records")
        .select("*", { count: "exact", head: true })
        .gte("reported_at", cooldownStart)
        .eq("cookie_id", cookieId),
    ]);

    if (cooldownResults.some(({ count }) => (count ?? 0) > 0)) {
      return jsonWithCookie(
        {
          success: false,
          error: "1시간에 1회만 품절 알림이 가능합니다. 잠시 후 다시 시도해주세요.",
        },
        429,
        cookieId
      );
    }
  }

  // 3. machine 현재 상태 확인
  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("id, status, floor, position, flavor")
    .eq("id", machineId)
    .single();

  if (machineError || !machine) {
    return jsonWithCookie(
      { success: false, error: "기계를 찾을 수 없습니다." },
      404,
      cookieId
    );
  }

  if (machine.status !== "available") {
    return jsonWithCookie(
      { success: false, error: "409: 현재 이용 가능 상태가 아닙니다." },
      409,
      cookieId
    );
  }

  // 4. status 업데이트 (race condition 방지)
  const { data: updated, error: updateError } = await supabase
    .from("machines")
    .update({
      status: "sold_out",
      updated_by: isAdmin ? "admin" : "employee",
    })
    .eq("id", machineId)
    .eq("status", "available")
    .select("id")
    .single();

  if (updateError || !updated) {
    return jsonWithCookie(
      { success: false, error: "409: 이미 처리된 상태입니다." },
      409,
      cookieId
    );
  }

  // 5. status_logs INSERT
  await supabase.from("status_logs").insert({
    machine_id: machineId,
    previous_status: "available",
    new_status: "sold_out",
    changed_by_type: isAdmin ? "admin" : "employee",
    changed_by_name: admin?.name ?? null,
    device_id: deviceId,
    ip_address: ipAddress,
    fingerprint,
    note: isAdmin ? `관리자(${admin!.name}) 품절 신고` : "직원 일시품절 신고",
  });

  // 6. abuse_records INSERT (모든 식별자 기록)
  await supabase.from("abuse_records").insert({
    device_id: deviceId,
    ip_address: ipAddress,
    machine_id: machineId,
    fingerprint,
    cookie_id: cookieId,
  });

  // 7. 이메일 알림 fire-and-forget
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  void fetch(`${baseUrl}/api/internal/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
    },
    body: JSON.stringify({ machineId }),
  }).catch(() => {});

  return jsonWithCookie({ success: true }, 200, cookieId);
}

// ─── 헬퍼 ───

/** JSON 응답 (쿠키 없이) */
function json(body: ApiResponse, status: number) {
  return NextResponse.json(body, { status });
}

/** JSON 응답 + HttpOnly cookie 설정 */
function jsonWithCookie(body: ApiResponse, status: number, cookieId: string) {
  const res = NextResponse.json(body, { status });
  res.cookies.set(COOKIE_NAME, cookieId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
