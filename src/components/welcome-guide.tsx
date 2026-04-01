"use client";

import { useState, useEffect } from "react";
import {
  CupSoda,
  Clock,
  Snowflake,
  CheckCircle,
  AlertTriangle,
  Wrench,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GUIDE_SEEN_KEY = "slush_welcome_guide_seen";

function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function markGuideSeen(): void {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, "true");
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

const STATUS_ITEMS = [
  {
    icon: Clock,
    label: "준비중",
    desc: "현재 슬러시가 준비되지 않았어요",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950",
  },
  {
    icon: Snowflake,
    label: "냉각중",
    desc: "아직 슬러시가 아니예요. 조금만 더 기다려주세요!",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-sky-950",
  },
  {
    icon: CheckCircle,
    label: "이용가능",
    desc: "지금 바로 먹을 수 있어요!",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950",
  },
  {
    icon: AlertTriangle,
    label: "일시품절",
    desc: "현재 슬러시가 없다고 제보가 들어왔어요!",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900",
  },
  {
    icon: Wrench,
    label: "고장",
    desc: "수리 중이에요",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
  },
] as const;

/** 슬라이드 콘텐츠 */
function SlideWelcome() {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <CupSoda className="size-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold">오늘의 슬러시에 오신 걸 환영해요!</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          이 페이지에서 각 층의 슬러시 기계 상태를
          <br />
          실시간으로 확인할 수 있어요.
        </p>
      </div>
      <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        슬러시 먹으러 갔는데 없으면 슬프잖아요...
        <br />
        미리 확인하고 가세요!
      </div>
    </div>
  );
}

function SlideStatus() {
  return (
    <div className="space-y-3 py-2">
      <p className="text-center text-sm text-muted-foreground">
        색상과 아이콘으로 상태를 한눈에 파악할 수 있어요
      </p>
      <div className="space-y-2">
        {STATUS_ITEMS.map(({ icon: Icon, label, desc, color, bg }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2",
              bg
            )}
          >
            <Icon className={cn("size-4 shrink-0", color)} />
            <div className="min-w-0">
              <span className={cn("text-sm font-medium", color)}>{label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTips() {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <PartyPopper className="size-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold">이제 준비 완료!</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          슬러시가 비어있는 걸 발견하면
          <br />
          <span className="font-medium text-foreground">품절 제보하기</span>
          를 눌러 알려주세요.
          <br />
          다른 직원들에게 큰 도움이 돼요!
        </p>
      </div>
      <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        페이지를 열어두면 상태가 자동으로 업데이트돼요.
        <br />
        새로고침할 필요 없어요!
      </div>
    </div>
  );
}

const SLIDES = [
  { title: "환영해요!", content: SlideWelcome },
  { title: "상태 안내", content: SlideStatus },
  { title: "알아두면 좋은 것", content: SlideTips },
] as const;

interface WelcomeGuideProps {
  /** 외부에서 가이드를 열기 위한 트리거 */
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function WelcomeGuide({ externalOpen, onExternalOpenChange }: WelcomeGuideProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(0);

  const open = externalOpen || internalOpen;

  useEffect(() => {
    if (!hasSeenGuide()) {
      setInternalOpen(true);
    }
  }, []);

  // 외부에서 열 때 첫 슬라이드로 리셋
  useEffect(() => {
    if (externalOpen) setStep(0);
  }, [externalOpen]);

  const handleClose = () => {
    markGuideSeen();
    setInternalOpen(false);
    onExternalOpenChange?.(false);
  };

  const isLast = step === SLIDES.length - 1;
  const CurrentSlide = SLIDES[step]!.content;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="z-60">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {SLIDES[step]!.title}
          </DialogTitle>
        </DialogHeader>

        <CurrentSlide />

        {/* 인디케이터 */}
        <div className="flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex gap-2">
          {step > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="size-4" />
              이전
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-muted-foreground"
              onClick={handleClose}
            >
              건너뛰기
            </Button>
          )}
          {isLast ? (
            <Button size="sm" className="flex-1" onClick={handleClose}>
              시작하기!
            </Button>
          ) : (
            <Button size="sm" className="flex-1" onClick={() => setStep(step + 1)}>
              다음
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
