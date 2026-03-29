import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { announcementSchema } from "@/lib/validations";

// POST: 새 공지 생성 (기존 활성 공지 모두 비활성화 후 INSERT)
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  try {
    const body = await request.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { content, createdBy } = parsed.data;
    const supabase = createAdminClient();

    // 기존 활성 공지 모두 비활성화
    const { error: deactivateError } = await supabase
      .from("announcements")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      return NextResponse.json(
        { success: false, error: "기존 공지 비활성화 실패" },
        { status: 500 }
      );
    }

    // 새 공지 INSERT
    const { data, error } = await supabase
      .from("announcements")
      .insert({ content, is_active: true, created_by: createdBy })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "공지 생성 실패" },
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

// GET: 활성 공지 조회
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("announcements")
      .select()
      .eq("is_active", true)
      .order("created_at", { ascending: false });

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
