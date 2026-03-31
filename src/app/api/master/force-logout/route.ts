import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMasterToken } from "@/lib/master-guard";

/**
 * POST /api/master/force-logout
 * 모든 관리자 세션을 강제 만료시킨다.
 * admin_token_epoch를 현재 시간으로 설정하여 이전에 발급된 모든 JWT를 무효화한다.
 */
export async function POST(req: NextRequest) {
  const token = await verifyMasterToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      admin_token_epoch: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", "global");

  if (error) {
    return NextResponse.json({ success: false, error: "로그아웃 처리에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
