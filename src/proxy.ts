import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login은 통과
  if (pathname === "/admin/login") return NextResponse.next();

  // /admin/* -> admin_token 쿠키 JWT 검증
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin_token")?.value;
    if (!token)
      return NextResponse.redirect(new URL("/admin/login", request.url));
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret)
        return NextResponse.redirect(new URL("/admin/login", request.url));
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
