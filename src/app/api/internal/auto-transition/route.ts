import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 냉각 자동 전환 API.
 * - POST body.machineId 있음: 단일 machine 전환 (클라이언트 트리거)
 * - POST body 없음 또는 machineId 없음: cooling_end_at <= now() 전체 일괄 전환 (크론)
 * - UPDATE status='available', available_since=now(), cooling_end_at=null
 * - status_logs INSERT (system)
 */
export async function POST(request: NextRequest) {
  // 내부 API 보호: CRON_SECRET 헤더 검증 (크론 호출 시)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "인증 실패" },
      { status: 401 }
    );
  }

  try {
    let body: { machineId?: string } = {};
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 전환할 machine 목록 조회
    let machineIds: string[] = [];

    if (body.machineId) {
      // 단일 전환: 해당 machine이 cooling 상태인지 확인
      const { data: machine, error } = await supabase
        .from("machines")
        .select("id, status, cooling_end_at")
        .eq("id", body.machineId)
        .eq("status", "cooling")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { success: false, error: "machine 조회 실패" },
          { status: 500 }
        );
      }

      if (machine) {
        machineIds = [machine.id];
      }
    } else {
      // 일괄 전환: cooling_end_at <= now() 인 모든 cooling machine
      const { data: machines, error } = await supabase
        .from("machines")
        .select("id")
        .eq("status", "cooling")
        .lte("cooling_end_at", now);

      if (error) {
        return NextResponse.json(
          { success: false, error: "machine 조회 실패" },
          { status: 500 }
        );
      }

      machineIds = (machines ?? []).map((m) => m.id);
    }

    if (machineIds.length === 0) {
      return NextResponse.json({ success: true, transitioned: 0 });
    }

    // 각 machine의 이전 상태 조회 (로그용)
    const { data: prevMachines, error: prevError } = await supabase
      .from("machines")
      .select("id, status")
      .in("id", machineIds);

    if (prevError) {
      return NextResponse.json(
        { success: false, error: "이전 상태 조회 실패" },
        { status: 500 }
      );
    }

    const prevStatusMap = new Map(
      (prevMachines ?? []).map((m) => [m.id, m.status])
    );

    // 상태 업데이트: available, available_since=now(), cooling_end_at=null
    const { data: updated, error: updateError } = await supabase
      .from("machines")
      .update({
        status: "available",
        available_since: now,
        cooling_end_at: null,
        updated_at: now,
      })
      .in("id", machineIds)
      .eq("status", "cooling") // 이미 전환된 기계 제외 (클라이언트 경로와 중복 방지)
      .select("id");

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "상태 업데이트 실패" },
        { status: 500 }
      );
    }

    const updatedIds = (updated ?? []).map((m) => m.id);

    if (updatedIds.length === 0) {
      return NextResponse.json({ success: true, transitioned: 0 });
    }

    // status_logs INSERT (system 변경자) — 실제 전환된 기계만
    const logInserts = updatedIds.map((id) => ({
      machine_id: id,
      previous_status: (prevStatusMap.get(id) ?? "cooling") as import("@/types").MachineStatus,
      new_status: "available" as const,
      changed_by_type: "system" as const,
      changed_by_name: null,
      device_id: null,
      ip_address: null,
      note: "냉각 완료 자동 전환",
    }));

    const { error: logError } = await supabase
      .from("status_logs")
      .insert(logInserts);

    if (logError) {
      // 로그 실패는 무시 (상태 변경은 이미 완료)
      console.error("status_logs INSERT 실패:", logError.message);
    }

    return NextResponse.json({
      success: true,
      transitioned: updatedIds.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
