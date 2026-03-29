import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types";

/** DELETE: 차단 해제 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.success) return guard.response;

  const { id } = await params;
  const banId = parseInt(id, 10);
  if (isNaN(banId)) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "유효하지 않은 ID입니다." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("banned_identifiers")
    .delete()
    .eq("id", banId);

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "차단 해제 실패" },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ success: true });
}
