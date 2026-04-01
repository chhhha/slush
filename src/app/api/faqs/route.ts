import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: 공개 FAQ 목록 조회 (인증 불필요)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("faqs")
      .select("id, question, answer, sort_order")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: "조회 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
