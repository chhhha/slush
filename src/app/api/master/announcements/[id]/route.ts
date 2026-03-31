import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMasterToken } from "@/lib/master-guard";

// DELETE: 공지 비활성화
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await verifyMasterToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("announcements")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "공지 비활성화 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
