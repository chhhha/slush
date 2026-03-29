import { NextRequest, NextResponse } from "next/server";
import { pinSchema } from "@/lib/validations";
import { createAdminToken, setAdminCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { pin, name } = parsed.data;
    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) {
      return NextResponse.json(
        { success: false, error: "서버 설정 오류" },
        { status: 500 }
      );
    }

    if (pin !== adminPin) {
      return NextResponse.json(
        { success: false, error: "PIN이 올바르지 않습니다" },
        { status: 401 }
      );
    }

    const token = await createAdminToken(name);
    await setAdminCookie(token);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
