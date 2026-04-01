"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { CupSoda, HelpCircle, Info, Wrench } from "lucide-react";
import { useMachines } from "@/hooks/use-machines";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { FloorMachineCard } from "@/components/machine-card";
import { ReportSoldOutDialog } from "@/components/report-soldout-dialog";
import { AnnouncementPopup } from "@/components/announcement-popup";
import { WelcomeGuide } from "@/components/welcome-guide";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FLOORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Machine } from "@/types";

/** 시간대별 인사말 (랜덤) */
const GREETINGS: Record<string, string[]> = {
  dawn: [
    "새벽 배포 끝! 슬러시 한 잔 갈까요? 🌙",
    "핫픽스 머지하고 시원하게 한 잔 🌙",
    "새벽 커밋 마친 당신, 슬러시 자격 충분 🌙",
    "아직 안 자요? 슬러시라도 한 잔 🌙",
    "새벽 코딩의 보상, 시원한 슬러시 🌙",
    "git push 하고 슬러시 한 잔 어때요? 🌙",
    "새벽감성 + 슬러시 = 최고의 조합 🌙",
    "이 시간에 슬러시라니, 진정한 개발자 🌙",
    "야근 아니고 새벽근무라고 우기는 중 🌙",
    "sleep(0); 대신 슬러시 한 잔 🌙",
  ],
  morning: [
    "좋은 아침! 오늘 첫 커밋 전에 한 잔? ☀️",
    "모닝 슬러시로 하루 부팅 완료! ☀️",
    "스탠드업 전에 슬러시 충전! ☀️",
    "커피 대신 슬러시로 시작하는 아침 ☀️",
    "오늘의 빌드, 슬러시와 함께 시작 ☀️",
    "좋은 아침! 컴파일 중에 한 잔? ☀️",
    "아침 슬러시 = 생산성 부스트 ☀️",
    "모니터 켜고 슬러시 한 잔, 완벽한 루틴 ☀️",
    "오전의 여유, 슬러시 한 잔으로 시작 ☀️",
    "npm start 하고 슬러시도 start! ☀️",
  ],
  lunch: [
    "점심 후 졸릴 때, 슬러시로 리프레시! 🧊",
    "런치 먹고 달달한 슬러시 한 잔 어때요? 🧊",
    "오후 슬럼프 방지! 시원한 한 잔 🧊",
    "점심 코마 탈출! 슬러시 파워! 🧊",
    "밥먹고 나른할 때, 슬러시가 정답 🧊",
    "식후 슬러시, 개발자의 디저트 🧊",
    "점심 후 슬러시 = 오후 생산성 확보 🧊",
    "졸음이 몰려온다면, 슬러시 한 잔 🧊",
    "런치 타임 끝, 슬러시 타임 시작 🧊",
    "오후 1시의 슬러시, 안 먹으면 손해 🧊",
  ],
  afternoon: [
    "코드 리뷰 중 당 충전 타임! 🍧",
    "3시의 슬러시, 집중력 부스터 🍧",
    "오후의 리팩토링, 슬러시와 함께 🍧",
    "버그 잡다 지칠 때, 달달한 한 잔 🍧",
    "오후 회의 전에 슬러시 한 잔? 🍧",
    "merge conflict도 슬러시 앞에선 별거 아냐 🍧",
    "4시 반, 슬러시 안 먹으면 서운해 🍧",
    "PR 올리고 슬러시 한 잔 보상 🍧",
    "디버깅 중 달콤한 휴식 🍧",
    "오후의 당 충전, 슬러시로 해결 🍧",
  ],
  evening: [
    "퇴근 전 달콤한 보상 한 잔! 🌅",
    "오늘 PR도 머지했으니, 슬러시 한 잔! 🌅",
    "featureComplete(); 슬러시로 마무리! 🌅",
    "하루 수고한 나에게, 슬러시 선물 🌅",
    "퇴근 전 마지막 슬러시, 놓치지 마세요 🌅",
    "git stash하고 슬러시 타임 🌅",
    "오늘도 고생했어요, 슬러시 한 잔 어때요? 🌅",
    "저녁 슬러시, 퇴근길의 시작 🌅",
    "deploy 끝! 보상 슬러시! 🌅",
    "칼퇴 전 시원한 한 잔의 여유 🌅",
  ],
  night: [
    "야근 파이팅! 슬러시로 버그 녹이자 💪",
    "늦은 밤 디버깅엔 슬러시가 국룰 💪",
    "야근 중이라면 슬러시로 힐링 한 잔 💪",
    "console.log('야근 중...'); 슬러시라도 한 잔 💪",
    "빈 사무실, 슬러시만이 내 편 💪",
    "야근 버프: 슬러시 +10 집중력 💪",
    "밤이 깊을수록 슬러시는 달다 💪",
    "오늘 안에 끝내자! 슬러시가 응원해요 💪",
    "while(야근) { 슬러시.마시기(); } 💪",
    "야근 보상은 슬러시로 충분 💪",
  ],
};

function getGreeting(): string {
  const h = new Date().getHours();
  let pool: string[];
  if (h < 6) pool = GREETINGS.dawn!;
  else if (h < 11) pool = GREETINGS.morning!;
  else if (h < 14) pool = GREETINGS.lunch!;
  else if (h < 17) pool = GREETINGS.afternoon!;
  else if (h < 20) pool = GREETINGS.evening!;
  else pool = GREETINGS.night!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

interface EmployeeViewProps {
  /** SSR로 초기 로드된 machines 데이터 */
  initialMachines: Machine[];
}

/**
 * 직원 메인 페이지 클라이언트 컴포넌트.
 * - useMachines 훅으로 Realtime 구독
 * - 층별 통합 카드 (좌우 탱크를 하나의 기계로 표시)
 * - 품절 신고 버튼 클릭 시 ReportSoldOutDialog 오픈
 */
export function EmployeeView({ initialMachines }: EmployeeViewProps) {
  const { machines } = useMachines(initialMachines);
  const { report_soldout_enabled } = useSiteSettings();
  const [reportTarget, setReportTarget] = useState<Machine | null>(null);
  const [isWiggling, setIsWiggling] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const handleLogoClick = useCallback(() => {
    setIsWiggling(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }, []);

  const getMachine = (floor: number, position: "left" | "right") =>
    machines.find((m) => m.floor === floor && m.position === position);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleLogoClick}
          >
            <CupSoda className={cn("size-5 text-primary", isWiggling && "animate-wiggle")} />
            <h1 className="text-lg font-bold tracking-tight text-primary">
              오늘의 슬러시
            </h1>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => setGuideOpen(true)}
            >
              <HelpCircle className="size-5" />
            </button>
            <Link href="/admin" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <Wrench className="size-5" />
            </Link>
            <Popover>
              <PopoverTrigger
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Info className="size-5" />
              </PopoverTrigger>
              <PopoverContent className="w-64 text-sm space-y-2">
                <p className="font-semibold">DA사업부 S/W개발그룹</p>
                <p>슬러시 이벤트 현황 페이지예요! 🍧</p>
                <p className="text-muted-foreground">
                  이 페이지는 100% AI가 개발했어요.
                </p>
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  <p>담당: 차재훈</p>
                  <a
                    href="mailto:jh8948.cha@samsung.com"
                    className="text-primary hover:underline"
                  >
                    jh8948.cha@samsung.com
                  </a>
                </div>
              </PopoverContent>
            </Popover>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 공지사항 팝업 */}
      <AnnouncementPopup />

      {/* 첫 방문 가이드 (공지보다 위에 표시되도록 나중에 렌더링) */}
      <WelcomeGuide externalOpen={guideOpen} onExternalOpenChange={setGuideOpen} />

      {/* 메인 콘텐츠 — 층별 통합 카드 */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-md space-y-4">
          {/* 시간대별 인사말 */}
          <p
            className="animate-greeting-fade text-center text-sm text-muted-foreground"
            suppressHydrationWarning
          >
            {greeting}
          </p>
          {FLOORS.map((floor, idx) => (
            <div
              key={floor}
              className="animate-card-enter"
              style={
                { "--enter-delay": `${idx * 120}ms` } as React.CSSProperties
              }
            >
              <FloorMachineCard
                floor={floor}
                leftMachine={getMachine(floor, "left")}
                rightMachine={getMachine(floor, "right")}
                onReportSoldOut={setReportTarget}
              />
            </div>
          ))}
        </div>
      </main>

      {/* 품절 신고 다이얼로그 */}
      {reportTarget && (
        <ReportSoldOutDialog
          machine={reportTarget}
          open={true}
          onOpenChange={(open) => {
            if (!open) setReportTarget(null);
          }}
          reportEnabled={report_soldout_enabled}
        />
      )}
    </div>
  );
}
