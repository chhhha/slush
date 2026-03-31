"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Construction,
  Frown,
  Hourglass,
  IceCreamCone,
  Info,
  BellRing,
  Snowflake,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { useCoolingTimer } from "@/hooks/use-cooling-timer";
import { formatElapsedTimeSimple } from "@/lib/utils/time";
import type { Machine } from "@/types";
import { cn } from "@/lib/utils";

/** 남은 시간(분) 기준 응원 메시지 */
function getCoolingMessage(remainingMinutes: number): string {
  if (remainingMinutes >= 15) return "냉각 시작! 조금만 기다려요 🧊";
  if (remainingMinutes >= 5) return "차가워지고 있어요... ❄️";
  return "거의 다 됐어요! 준비하세요 🎉";
}

// 아이콘 매핑 (lucide-react 컴포넌트)
const STATUS_ICON_MAP = {
  preparing: Clock,
  cooling: Snowflake,
  available: CheckCircle,
  sold_out: AlertTriangle,
  broken: Wrench,
} as const;

interface FloorMachineCardProps {
  floor: number;
  leftMachine: Machine | undefined;
  rightMachine: Machine | undefined;
  onReportSoldOut: (machine: Machine) => void;
}

/**
 * 한 층의 슬러시 기계(좌우 2통)를 하나의 카드로 표시하는 컴포넌트.
 * 실제 기계 형태처럼 좌우 통이 붙어있는 레이아웃.
 */
export function FloorMachineCard({
  floor,
  leftMachine,
  rightMachine,
  onReportSoldOut,
}: FloorMachineCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* 층 헤더 */}
      <div
        className={cn(
          "relative flex items-center border-b px-4 py-2.5 overflow-hidden",
          floor === 4 && "bg-gradient-to-r from-sky-50/80 to-transparent dark:from-sky-950/40",
          floor === 3 && "bg-gradient-to-r from-cyan-50/80 to-transparent dark:from-cyan-950/40",
          floor === 2 && "bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-950/40",
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1 rounded-r-full",
            floor === 4 && "bg-sky-400 dark:bg-sky-500",
            floor === 3 && "bg-cyan-400 dark:bg-cyan-500",
            floor === 2 && "bg-blue-400 dark:bg-blue-500",
          )}
        />
        {/* 장식 원 패턴 */}
        <div
          className={cn(
            "pointer-events-none absolute -right-3 -top-3 size-16 rounded-full opacity-[0.07] dark:opacity-[0.05]",
            floor === 4 && "bg-sky-400",
            floor === 3 && "bg-cyan-400",
            floor === 2 && "bg-blue-400",
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute right-8 -bottom-2 size-8 rounded-full opacity-[0.05] dark:opacity-[0.04]",
            floor === 4 && "bg-sky-300",
            floor === 3 && "bg-cyan-300",
            floor === 2 && "bg-blue-300",
          )}
        />
        <h3
          className={cn(
            "text-base font-semibold",
            floor === 4 && "text-sky-600 dark:text-sky-400",
            floor === 3 && "text-cyan-600 dark:text-cyan-400",
            floor === 2 && "text-blue-600 dark:text-blue-400",
          )}
        >
          {floor}층
        </h3>
        <span className="ml-auto">
          <Popover>
            <PopoverTrigger className={cn(
              "transition-colors flex items-center cursor-pointer",
              floor === 4 && "text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400",
              floor === 3 && "text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400",
              floor === 2 && "text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400",
            )}>
              <Info className="size-4" />
            </PopoverTrigger>
            <PopoverContent className="w-auto text-sm text-muted-foreground">
              {floor === 4 && "DA1동 4층 A존 탕비실"}
              {floor === 3 && "DA1동 3층 B존 제품S/W개발Lab 탕비실 (S/W 시험실 뒤쪽)"}
              {floor === 2 && "DA1동 2층 C존 S/W Platform Lab 탕비실"}
            </PopoverContent>
          </Popover>
        </span>
      </div>

      {/* 좌우 탱크 패널 */}
      <div className="grid grid-cols-2 divide-x">
        <TankPanel
          machine={leftMachine}
          floor={floor}
          onReportSoldOut={onReportSoldOut}
        />
        <TankPanel
          machine={rightMachine}
          floor={floor}
          onReportSoldOut={onReportSoldOut}
        />
      </div>
    </div>
  );
}

/* ── 탱크 패널 (하나의 통) ── */

interface TankPanelProps {
  machine: Machine | undefined;
  floor: number;
  onReportSoldOut: (machine: Machine) => void;
}

function TankPanel({ machine, floor, onReportSoldOut }: TankPanelProps) {
  if (!machine) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 p-4 text-muted-foreground">
        <IceCreamCone className="size-5 opacity-40" />
        <span className="text-xs opacity-60">미등록</span>
      </div>
    );
  }

  return (
    <TankContent
      machine={machine}
      onReportSoldOut={() => onReportSoldOut(machine)}
    />
  );
}

/* ── 탱크 콘텐츠 (hooks 사용을 위해 분리) ── */

function TankContent({
  machine,
  onReportSoldOut,
}: {
  machine: Machine;
  onReportSoldOut: () => void;
}) {
  const colors = STATUS_COLORS[machine.status];
  const label = STATUS_LABELS[machine.status];
  const Icon = STATUS_ICON_MAP[machine.status];

  // 냉각 완료 시 서버에 자동 전환 요청
  const handleCoolingExpired = useCallback(() => {
    fetch(`/api/machines/${machine.id}/complete-cooling`, {
      method: "POST",
    }).catch(() => {});
  }, [machine.id]);

  const { remaining } = useCoolingTimer({
    coolingEndAt: machine.status === "cooling" ? machine.cooling_end_at : null,
    onExpired: handleCoolingExpired,
  });

  // 상태 변경 시 플래시 애니메이션 + 이용가능 전환 축하
  const prevStatusRef = useRef(machine.status);
  const [showRing, setShowRing] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== machine.status) {
      const wasNotAvailable = prevStatusRef.current !== "available";
      prevStatusRef.current = machine.status;

      setShowRing(true);
      const ringTimer = setTimeout(() => setShowRing(false), 700);

      // 이용가능으로 전환 시 축하 팝!
      if (machine.status === "available" && wasNotAvailable) {
        setShowCelebrate(true);
        const celebTimer = setTimeout(() => setShowCelebrate(false), 600);
        return () => { clearTimeout(ringTimer); clearTimeout(celebTimer); };
      }

      return () => clearTimeout(ringTimer);
    }
  }, [machine.status]);

  // 냉각 진행률
  const coolingProgress = (() => {
    if (
      machine.status !== "cooling" ||
      !machine.cooling_end_at ||
      !machine.updated_at
    )
      return 0;
    const total =
      new Date(machine.cooling_end_at).getTime() -
      new Date(machine.updated_at).getTime();
    if (total <= 0) return 100;
    const elapsed = Date.now() - new Date(machine.updated_at).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  const isInactive = machine.status === "sold_out" || machine.status === "broken" || machine.status === "preparing";

  const INACTIVE_ICON_MAP = {
    sold_out: Frown,
    broken: Construction,
    preparing: Hourglass,
  } as const;

  const STATUS_DESCRIPTIONS: Record<string, string> = {
    preparing: "현재 슬러시가 제공되지 않는 상태예요! (재료 소진, 마감, 담당자 부재, 기계 세척 등)",
    cooling: "음료를 차갑게 얼리는 중이에요. 이용 가능으로 변경된 후에 이용해주세요!",
    available: "지금 바로 슬러시를 즐길 수 있어요! 품절되었다면 아래 버튼으로 제보해 주세요.",
    sold_out: "슬러시가 모두 소진되었다고 제보가 들어왔어요! 관리자가 상태를 확인하러 가야해요.",
    broken: "기계에 문제가 생겼어요. 관리자가 확인 중이니 조금만 기다려 주세요!",
  };

  // 비활성 상태: 아이콘 중심의 간결한 레이아웃
  if (isInactive) {
    const InactiveIcon = INACTIVE_ICON_MAP[machine.status as keyof typeof INACTIVE_ICON_MAP];
    return (
      <div
        className={cn(
          "flex min-h-[120px] flex-col items-center justify-center gap-2 p-3 transition-colors duration-300",
          colors.bg,
          showRing && "animate-status-ring"
        )}
      >
        <InactiveIcon className={cn("size-10 opacity-20", colors.text)} />
        <Popover>
          <PopoverTrigger className="cursor-pointer">
            <Badge className={cn("shrink-0 text-xs", colors.badge)}>
              <Icon className="size-3" />
              {label}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[200px] text-sm">
            {STATUS_DESCRIPTIONS[machine.status]}
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col p-3 transition-colors duration-300",
        colors.bg,
        machine.status === "available" && "animate-glow-pulse",
        showRing && "animate-status-ring",
        showCelebrate && "animate-celebrate-pop"
      )}
    >
      {/* 상단: 맛 + 상태 뱃지 (같은 행) */}
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-base font-bold truncate", colors.text)}>
          {machine.flavor || "\u00A0"}
        </p>
        <Popover>
          <PopoverTrigger className="cursor-pointer">
            <Badge className={cn("shrink-0 text-xs", colors.badge)}>
              <Icon
                className={cn(
                  "size-3",
                  machine.status === "cooling" && "animate-gentle-spin",
                  machine.status === "available" && "animate-icon-breathe"
                )}
              />
              {label}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[200px] text-sm">
            {STATUS_DESCRIPTIONS[machine.status]}
          </PopoverContent>
        </Popover>
      </div>

      {/* 하단 고정: 액션 영역 (상태별 내용, 동일 높이) */}
      <div className="mt-auto min-h-[40px] flex flex-col justify-end pt-3">
        {machine.status === "cooling" && (
          <div className="space-y-1">
            <p
              className={cn("text-xs", colors.text, "opacity-75")}
              suppressHydrationWarning
            >
              {remaining ?? "냉각 시간 계산 중..."}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200/50 dark:bg-blue-800/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-500 dark:to-cyan-500 animate-progress-breathe transition-[width] duration-1000 ease-linear"
                style={{ width: `${coolingProgress}%` }}
                suppressHydrationWarning
              />
            </div>
            <p
              className={cn("text-[10px]", colors.text, "opacity-50")}
              suppressHydrationWarning
            >
              {getCoolingMessage(
                machine.cooling_end_at
                  ? Math.max(0, (new Date(machine.cooling_end_at).getTime() - Date.now()) / 60000)
                  : 0
              )}
            </p>
          </div>
        )}

        {machine.status === "available" && (
          <Button
            size="sm"
            className="w-full min-h-9 text-xs active:scale-[0.97] bg-green-600 text-white hover:bg-green-700 shadow-sm dark:bg-green-700 dark:hover:bg-green-600"
            onClick={onReportSoldOut}
          >
            <BellRing className="size-4" />
            품절 제보하기
          </Button>
        )}
      </div>

      {/* 최하단: 세척 정보 (항상 공간 확보) */}
      <p
        className={cn("mt-2 text-xs h-4", colors.text, "opacity-75")}
        suppressHydrationWarning
      >
        {machine.last_cleaned_at
          ? `마지막 세척: ${formatElapsedTimeSimple(machine.last_cleaned_at)}`
          : "\u00A0"}
      </p>
    </div>
  );
}
