import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import type { ApiResponse } from "@/types";

const banSchema = z.object({
  identifierType: z.enum(["device_id", "ip_address", "fingerprint", "cookie_id"]),
  identifierValue: z.string().min(1).max(256),
  reason: z.string().max(200).optional(),
});

/** GET: 차단 목록 조회 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("banned_identifiers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "차단 목록 조회 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ success: true, data });
}

/** POST: 식별자 차단 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const parsed = banSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "유효하지 않은 요청입니다." },
      { status: 400 }
    );
  }

  const { identifierType, identifierValue, reason } = parsed.data;
  const supabase = createAdminClient();

  const { error } = await supabase.from("banned_identifiers").insert({
    identifier_type: identifierType,
    identifier_value: identifierValue,
    banned_by: guard.admin.name,
    reason: reason ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "이미 차단된 식별자입니다." },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "차단 처리 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ success: true });
}
