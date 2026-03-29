import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { POSITION_LABELS } from "@/lib/constants";

// POST: 특정 machine의 일시품절 알림 이메일 발송 (fire-and-forget)
export async function POST(request: NextRequest) {
  // 내부 API 인증: CRON_SECRET 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "인증 실패" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { machineId } = body as { machineId: string };

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: "machineId 필요" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // machine 정보 조회
    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select()
      .eq("id", machineId)
      .single();

    if (machineError || !machine) {
      return NextResponse.json(
        { success: false, error: "기계 정보 조회 실패" },
        { status: 404 }
      );
    }

    // 수신자 목록 조회
    const { data: recipients, error: recipientsError } = await supabase
      .from("email_recipients")
      .select("email")
      .eq("machine_id", machineId);

    if (recipientsError) {
      return NextResponse.json(
        { success: false, error: "수신자 조회 실패" },
        { status: 500 }
      );
    }

    if (!recipients || recipients.length === 0) {
      // 수신자 없으면 발송 스킵 (성공 처리)
      return NextResponse.json({ success: true, sent: 0 });
    }

    const positionLabel = POSITION_LABELS[machine.position];
    const subject = `[슬러시 일시품절] ${machine.floor}층 ${positionLabel} - ${machine.flavor}`;
    const emailList = recipients.map((r) => r.email);

    // Resend 인스턴스는 런타임에 생성 (빌드 시 API key 불필요)
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: emailList,
      subject,
      text: `${machine.floor}층 ${positionLabel}(${machine.flavor}) 슬러시가 일시품절되었습니다.`,
    });

    if (sendError) {
      console.error("[send-email] Resend 발송 실패:", sendError);
      return NextResponse.json(
        { success: false, error: "이메일 발송 실패" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sent: emailList.length });
  } catch {
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
