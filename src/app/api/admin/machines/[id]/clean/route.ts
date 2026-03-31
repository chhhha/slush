import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const parsed = cleanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "입력값이 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const { adminName } = parsed.data;
  const supabase = createAdminClient();

  // 현재 기계 상태 조회
  const { data: current, error: fetchError } = await supabase
    .from("machines")
    .select()
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json(
      { success: false, error: "기계를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // last_cleaned_at 업데이트
  const { error: updateError } = await supabase
    .from("machines")
    .update({ last_cleaned_at: now, updated_by: adminName })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: "세척 시간 초기화에 실패했습니다" },
      { status: 500 }
    );
  }

  // 상태 로그 기록 (세척 시간 초기화 note)
  await supabase.from("status_logs").insert({
    machine_id: id,
    previous_status: current.status,
    new_status: current.status,
    changed_by_type: "admin" as const,
    changed_by_name: adminName,
    device_id: null,
    ip_address: null,
    note: "세척 시간 초기화",
  });

  return NextResponse.json({ success: true });
}
