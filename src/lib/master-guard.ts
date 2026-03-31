import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const MASTER_TOKEN_COOKIE = "master_token";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET 미설정");
  return new TextEncoder().encode(s);
}

export interface MasterTokenPayload {
  role: "master";
  iat: number;
}

export async function createMasterToken(): Promise<string> {
  return new SignJWT({
    role: "master" as const,
  } satisfies Omit<MasterTokenPayload, "iat">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());
}

export async function verifyMasterToken(): Promise<MasterTokenPayload | null> {
  try {
    const cs = await cookies();
    const t = cs.get(MASTER_TOKEN_COOKIE)?.value;
    if (!t) return null;
    const { payload } = await jwtVerify(t, getSecret());
    const tokenPayload = payload as unknown as MasterTokenPayload;
    return tokenPayload;
  } catch {
    return null;
  }
}

export async function setMasterCookie(token: string): Promise<void> {
  const cs = await cookies();
  cs.set(MASTER_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1시간
  });
}

export async function clearMasterCookie(): Promise<void> {
  (await cookies()).delete(MASTER_TOKEN_COOKIE);
}
