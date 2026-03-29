import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: 공개 - 활성 공지 1건 조회
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("announcements")
      .select()
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: "조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
