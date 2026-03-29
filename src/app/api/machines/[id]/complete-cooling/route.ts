import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

/**
 * POST /api/machines/[id]/complete-cooling
 * 냉각 완료 자동 전환 API (클라이언트 트리거).
 *
 * 인증 불필요 — 서버에서 cooling_end_at <= now() 조건을 검증하므로 악용 불가.
 * 여러 클라이언트가 동시에 호출해도 멱등성 보장 (WHERE status='cooling' 조건).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. 해당 machine이 cooling 상태이고 cooling_end_at이 지났는지 확인
  const { data: machine, error: fetchError } = await supabase
    .from("machines")
    .select("id, status, cooling_end_at")
    .eq("id", machineId)
    .eq("status", "cooling")
    .lte("cooling_end_at", now)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "조회 실패" },
      { status: 500 }
    );
  }

  // 조건 불충족 (이미 전환됨, 아직 냉각 중 등) → 성공으로 처리 (멱등)
  if (!machine) {
    return NextResponse.json<ApiResponse>({ success: true });
  }

  // 2. 상태 전환: cooling → available
  const { data: updated, error: updateError } = await supabase
    .from("machines")
    .update({
      status: "available",
      available_since: now,
      cooling_end_at: null,
      updated_at: now,
    })
    .eq("id", machineId)
    .eq("status", "cooling") // race condition 방지
    .select("id");

  if (updateError) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "상태 업데이트 실패" },
      { status: 500 }
    );
  }

  // 이미 다른 경로(크론 등)에서 전환됨 → 로그 중복 방지
  if (!updated || updated.length === 0) {
    return NextResponse.json<ApiResponse>({ success: true });
  }

  // 3. 로그 기록 (실패해도 전환은 유지)
  await supabase
    .from("status_logs")
    .insert({
      machine_id: machineId,
      previous_status: "cooling",
      new_status: "available",
      changed_by_type: "system",
      changed_by_name: null,
      device_id: null,
      ip_address: null,
      note: "냉각 완료 자동 전환",
    })
    .then(({ error }) => {
      if (error) console.error("status_logs INSERT 실패:", error.message);
    });

  return NextResponse.json<ApiResponse>({ success: true });
}
