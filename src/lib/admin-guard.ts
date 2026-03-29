import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import type { AdminTokenPayload } from "@/types";

export async function requireAdmin(): Promise<
  | { success: true; admin: AdminTokenPayload }
  | { success: false; response: NextResponse }
> {
  const admin = await verifyAdminToken();
  if (!admin)
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "관리자 인증 필요" },
        { status: 401 }
      ),
    };
  return { success: true, admin };
}
