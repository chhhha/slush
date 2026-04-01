"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CupSoda,
  Clock,
  Snowflake,
  CheckCircle,
  AlertTriangle,
  Wrench,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  PartyPopper,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Faq } from "@/types";

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

// ─── 가이드 슬라이드 ───

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

// ─── 가이드 뷰 ───

function GuideView({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const CurrentSlide = SLIDES[step]!.content;

  return (
    <>
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
            onClick={onClose}
          >
            건너뛰기
          </Button>
        )}
        {isLast ? (
          <Button size="sm" className="flex-1" onClick={onClose}>
            시작하기!
          </Button>
        ) : (
          <Button size="sm" className="flex-1" onClick={() => setStep(step + 1)}>
            다음
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </>
  );
}

// ─── FAQ 뷰 ───

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border transition-colors">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug break-words">{faq.question}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="whitespace-pre-line break-words px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function FaqView() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faqs")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFaqs(data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        불러오는 중...
      </p>
    );
  }

  if (faqs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <HelpCircle className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          아직 등록된 FAQ가 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
      {faqs.map((faq) => (
        <FaqItem key={faq.id} faq={faq} />
      ))}
    </div>
  );
}

// ─── 메뉴 선택 뷰 ───

type HelpTab = "menu" | "guide" | "faq";

function MenuView({ onSelect }: { onSelect: (tab: "guide" | "faq") => void }) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-center text-sm text-muted-foreground">
        무엇을 확인하고 싶으세요?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
          onClick={() => onSelect("guide")}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">이용 가이드</p>
            <p className="text-xs text-muted-foreground">사용법 안내</p>
          </div>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
          onClick={() => onSelect("faq")}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <HelpCircle className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">자주 묻는 질문</p>
            <p className="text-xs text-muted-foreground">FAQ</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───

interface WelcomeGuideProps {
  /** 외부에서 가이드를 열기 위한 트리거 */
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function WelcomeGuide({ externalOpen, onExternalOpenChange }: WelcomeGuideProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [tab, setTab] = useState<HelpTab>("menu");

  const open = externalOpen || internalOpen;

  // 첫 방문 시 가이드 자동 오픈
  useEffect(() => {
    if (!hasSeenGuide()) {
      setIsFirstVisit(true);
      setTab("guide");
      setInternalOpen(true);
    }
  }, []);

  // 외부에서 열 때 메뉴 선택 화면으로
  useEffect(() => {
    if (externalOpen) {
      setTab("menu");
      setIsFirstVisit(false);
    }
  }, [externalOpen]);

  const handleClose = () => {
    markGuideSeen();
    setInternalOpen(false);
    setIsFirstVisit(false);
    onExternalOpenChange?.(false);
  };

  const handleBack = () => {
    setTab("menu");
  };

  const dialogTitle =
    tab === "menu" ? "도움말" : tab === "guide" ? "이용 가이드" : "자주 묻는 질문";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="z-60">
        <DialogHeader>
          <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
        </DialogHeader>

        {/* 첫 방문이면 가이드만 표시 */}
        {isFirstVisit ? (
          <GuideView onClose={handleClose} />
        ) : (
          <>
            {/* 뒤로가기 헤더 (가이드/FAQ 탭일 때만) */}
            {tab !== "menu" && (
              <div className="flex items-center gap-2 -mt-2 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={handleBack}
                >
                  <ChevronLeft className="size-4" />
                  돌아가기
                </Button>
                <span className="text-sm font-semibold">{dialogTitle}</span>
              </div>
            )}

            {tab === "menu" && <MenuView onSelect={setTab} />}
            {tab === "guide" && <GuideView onClose={handleClose} />}
            {tab === "faq" && <FaqView />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
