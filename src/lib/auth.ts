import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { AdminTokenPayload } from "@/types";

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
    return payload as unknown as AdminTokenPayload;
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
