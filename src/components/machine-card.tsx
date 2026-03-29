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
import { formatElapsedTime } from "@/lib/utils/time";
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
      <div className="flex items-center border-b px-4 py-2.5">
        <h3 className="text-base font-semibold text-foreground">{floor}층</h3>
        <span className="ml-auto">
          <Popover>
            <PopoverTrigger className="text-muted-foreground hover:text-foreground transition-colors flex items-center cursor-pointer">
              <Info className="size-4" />
            </PopoverTrigger>
            <PopoverContent className="w-auto text-sm">
              추후 작성 예정
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
          <PopoverContent className="w-auto text-sm">
            추후 작성 예정
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
          <PopoverContent className="w-auto text-sm">
            추후 작성 예정
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
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-500 dark:to-cyan-500 animate-progress-shimmer transition-[width] duration-1000 ease-linear"
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
            품절 알리기
          </Button>
        )}
      </div>

      {/* 최하단: 세척 정보 (항상 공간 확보) */}
      <p
        className={cn("mt-2 text-xs h-4", colors.text, "opacity-75")}
        suppressHydrationWarning
      >
        {machine.last_cleaned_at
          ? `마지막 세척: ${formatElapsedTime(machine.last_cleaned_at)}`
          : "\u00A0"}
      </p>
    </div>
  );
}
