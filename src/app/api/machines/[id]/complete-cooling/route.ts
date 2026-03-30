import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

/**
 * POST /api/machines/[id]/complete-cooling
 * 냉각 완료 자동 전환 API (클라이언트 트리거).
 *
 * DB 함수(complete_cooling)가 cooling_end_at <= now() 조건을 검증하므로
 * anon 클라이언트로 안전하게 호출 가능. 멱등성 보장.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("complete_cooling", {
    p_machine_id: machineId,
  });

  if (error) {
    console.error("complete_cooling RPC 실패:", error.message);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "상태 전환 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ success: true });
}
