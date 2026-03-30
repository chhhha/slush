import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 마스터 인증 확인 */
function isMasterAuthed(req: NextRequest): boolean {
  return req.cookies.get("master_authed")?.value === "true";
}

/**
 * GET /api/master/settings
 * 현재 사이트 설정 조회 (마스터 전용).
 */
export async function GET(req: NextRequest) {
  if (!isMasterAuthed(req)) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "global")
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: "설정을 불러올 수 없습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

/**
 * PUT /api/master/settings
 * 사이트 설정 업데이트 (마스터 전용).
 */
export async function PUT(req: NextRequest) {
  if (!isMasterAuthed(req)) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  const body = (await req.json()) as {
    report_soldout_enabled?: boolean;
    admin_login_strict?: boolean;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.report_soldout_enabled === "boolean") {
    updates.report_soldout_enabled = body.report_soldout_enabled;
  }
  if (typeof body.admin_login_strict === "boolean") {
    updates.admin_login_strict = body.admin_login_strict;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .update(updates)
    .eq("id", "global");

  if (error) {
    return NextResponse.json({ success: false, error: "설정 변경에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
