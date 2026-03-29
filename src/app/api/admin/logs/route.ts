import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOG_CONFIG } from "@/lib/constants";

// GET: 상태 변경 로그 조회 (페이지네이션, machineId 필터)
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    const pageParam = searchParams.get("page");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const pageSizeParam = searchParams.get("pageSize");
    const pageSize = pageSizeParam
      && (LOG_CONFIG.PAGE_SIZE_OPTIONS as readonly number[]).includes(parseInt(pageSizeParam, 10))
      ? parseInt(pageSizeParam, 10)
      : LOG_CONFIG.DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();

    let query = supabase
      .from("status_logs")
      .select(
        `
        id,
        machine_id,
        previous_status,
        new_status,
        changed_by_type,
        changed_by_name,
        device_id,
        ip_address,
        fingerprint,
        note,
        created_at,
        machines ( floor, position, flavor )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (machineId) {
      query = query.eq("machine_id", machineId);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: "로그 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
