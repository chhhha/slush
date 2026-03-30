import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/site-settings
 * 공개 API — 클라이언트에서 사이트 설정을 조회한다.
 */
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("report_soldout_enabled")
    .eq("id", "global")
    .single();

  if (error || !data) {
    // 설정이 없으면 기본값(활성)으로 반환
    return NextResponse.json({ report_soldout_enabled: true });
  }

  return NextResponse.json(data);
}
