import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { faqSchema } from "@/lib/validations";
import { verifyMasterToken } from "@/lib/master-guard";

// GET: 전체 FAQ 목록 조회
export async function GET() {
  const token = await verifyMasterToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("faqs")
      .select()
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

// POST: FAQ 추가
export async function POST(request: NextRequest) {
  const token = await verifyMasterToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = faqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // sort_order가 없으면 마지막 순서 + 1
    let sortOrder = parsed.data.sort_order;
    if (sortOrder === undefined) {
      const { data: last } = await supabase
        .from("faqs")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      sortOrder = (last?.sort_order ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from("faqs")
      .insert({
        question: parsed.data.question,
        answer: parsed.data.answer,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: "FAQ 추가 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
