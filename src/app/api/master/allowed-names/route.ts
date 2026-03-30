import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 마스터 인증 확인 */
function isMasterAuthed(req: NextRequest): boolean {
  return req.cookies.get("master_authed")?.value === "true";
}

/**
 * GET /api/master/allowed-names
 * 허용된 관리자 이름 목록 조회.
 */
export async function GET(req: NextRequest) {
  if (!isMasterAuthed(req)) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_allowed_names")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: "목록을 불러올 수 없습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

/**
 * POST /api/master/allowed-names
 * 허용 이름 추가.
 */
export async function POST(req: NextRequest) {
  if (!isMasterAuthed(req)) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name || name.length < 1 || name.length > 20) {
    return NextResponse.json({ success: false, error: "이름은 1~20자로 입력해주세요." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_allowed_names")
    .insert({ name })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "이미 등록된 이름입니다." }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "이름 추가에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

/**
 * DELETE /api/master/allowed-names
 * 허용 이름 삭제 (id 기반).
 */
export async function DELETE(req: NextRequest) {
  if (!isMasterAuthed(req)) {
    return NextResponse.json({ success: false, error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "삭제할 이름 ID가 필요합니다." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_allowed_names")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return NextResponse.json({ success: false, error: "삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
