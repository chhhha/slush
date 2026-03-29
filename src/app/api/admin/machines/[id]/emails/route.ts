import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailRecipientSchema } from "@/lib/validations";
import { INPUT_LIMITS } from "@/lib/constants";

// GET: 해당 machine의 이메일 수신자 목록
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("email_recipients")
      .select()
      .eq("machine_id", id)
      .order("created_at", { ascending: true });

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

// POST: 수신자 추가 (통당 10명 제한)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = emailRecipientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "올바른 이메일 주소를 입력해주세요" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const supabase = createAdminClient();

    // 현재 수신자 수 확인 (통당 최대 10명)
    const { count, error: countError } = await supabase
      .from("email_recipients")
      .select("id", { count: "exact", head: true })
      .eq("machine_id", id);

    if (countError) {
      return NextResponse.json(
        { success: false, error: "수신자 수 확인 실패" },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= INPUT_LIMITS.MAX_EMAIL_RECIPIENTS_PER_MACHINE) {
      return NextResponse.json(
        {
          success: false,
          error: `수신자는 통당 최대 ${INPUT_LIMITS.MAX_EMAIL_RECIPIENTS_PER_MACHINE}명까지 등록 가능합니다`,
        },
        { status: 400 }
      );
    }

    // INSERT (UNIQUE 위반 시 409)
    const { data, error } = await supabase
      .from("email_recipients")
      .insert({ machine_id: id, email })
      .select()
      .single();

    if (error) {
      // UNIQUE 제약 위반
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "이미 등록된 이메일 주소입니다" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "수신자 추가 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
