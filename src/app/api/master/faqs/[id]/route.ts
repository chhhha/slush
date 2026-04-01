import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { faqUpdateSchema } from "@/lib/validations";
import { verifyMasterToken } from "@/lib/master-guard";

// PATCH: FAQ 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await verifyMasterToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const faqId = Number(id);
    if (Number.isNaN(faqId)) {
      return NextResponse.json({ success: false, error: "잘못된 ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = faqUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("faqs")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", faqId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: "FAQ 수정 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

// DELETE: FAQ 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await verifyMasterToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const faqId = Number(id);
    if (Number.isNaN(faqId)) {
      return NextResponse.json({ success: false, error: "잘못된 ID" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("faqs")
      .delete()
      .eq("id", faqId);

    if (error) {
      return NextResponse.json({ success: false, error: "FAQ 삭제 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
