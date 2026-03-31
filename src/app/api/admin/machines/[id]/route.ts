import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusChangeSchema, flavorChangeSchema } from "@/lib/validations";
import { calculateCoolingEndAt } from "@/lib/utils/time";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  const { id } = await params;
  const body = await request.json();

  const supabase = createAdminClient();

  // flavor 변경 요청인지 확인
  const flavorParsed = flavorChangeSchema.safeParse(body);
  const statusParsed = statusChangeSchema.safeParse(body);

  if (!statusParsed.success && !flavorParsed.success) {
    return NextResponse.json(
      { success: false, error: "입력값이 올바르지 않습니다" },
      { status: 400 }
    );
  }

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

  // flavor만 변경하는 경우
  if (flavorParsed.success && !statusParsed.success) {
    const { flavor, adminName } = flavorParsed.data;
    const { error } = await supabase
      .from("machines")
      .update({ flavor, updated_by: adminName })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "맛 변경에 실패했습니다" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  }

  const { status, coolingMinutes, adminName } = statusParsed.data!;

  // cooling 상태로 변경 시 coolingMinutes 필수
  if (status === "cooling" && !coolingMinutes) {
    return NextResponse.json(
      { success: false, error: "냉각 시간(분)을 입력해주세요" },
      { status: 400 }
    );
  }

  // 상태별 날짜 필드 계산
  let coolingEndAt: string | null = null;
  let availableSince: string | null = null;

  if (status === "cooling" && coolingMinutes) {
    coolingEndAt = calculateCoolingEndAt(coolingMinutes);
  } else if (status === "available") {
    availableSince = new Date().toISOString();
  }

  // 기계 상태 업데이트
  const { error: updateError } = await supabase
    .from("machines")
    .update({
      status,
      cooling_end_at: coolingEndAt,
      available_since: availableSince,
      updated_by: adminName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: "상태 변경에 실패했습니다" },
      { status: 500 }
    );
  }

  // 상태 로그 기록
  await supabase.from("status_logs").insert({
    machine_id: id,
    previous_status: current.status,
    new_status: status,
    changed_by_type: "admin" as const,
    changed_by_name: adminName,
    device_id: null,
    ip_address: null,
    note: null,
  });

  return NextResponse.json({ success: true });
}
