import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AdminTokenPayload } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

const AUTH_COOKIE = "admin_token";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET 미설정");
  return new TextEncoder().encode(s);
}

export async function createAdminToken(name: string): Promise<string> {
  return new SignJWT({
    role: "admin" as const,
    name,
  } satisfies Omit<AdminTokenPayload, "iat">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("18h")
    .sign(getSecret());
}

export async function verifyAdminToken(): Promise<AdminTokenPayload | null> {
  try {
    const cs = await cookies();
    const t = cs.get(AUTH_COOKIE)?.value;
    if (!t) return null;
    const { payload } = await jwtVerify(t, getSecret());
    const tokenPayload = payload as unknown as AdminTokenPayload;

    // admin_token_epoch 이전에 발급된 토큰은 무효화
    const supabase = createAdminClient();
    const { data: settings } = await supabase
      .from("site_settings")
      .select("admin_token_epoch")
      .eq("id", "global")
      .single();

    if (settings?.admin_token_epoch) {
      const epoch = Math.floor(new Date(settings.admin_token_epoch).getTime() / 1000);
      if (tokenPayload.iat < epoch) return null;
    }

    return tokenPayload;
  } catch {
    return null;
  }
}

export async function setAdminCookie(token: string): Promise<void> {
  const cs = await cookies();
  cs.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // maxAge 없음 = 세션 쿠키 (브라우저 종료 시 삭제)
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
}
