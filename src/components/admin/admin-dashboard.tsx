"use client";

import Link from "next/link";
import { useMachines } from "@/hooks/use-machines";
import { useBrowserNotification } from "@/hooks/use-browser-notification";
import { AdminHeader } from "@/components/admin/admin-header";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, IceCreamCone } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  FLOORS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatElapsedTime } from "@/lib/utils/time";
import type { Machine } from "@/types";

interface AdminDashboardProps {
  initialMachines: Machine[];
}

export function AdminDashboard({ initialMachines }: AdminDashboardProps) {
  const { machines } = useMachines(initialMachines);
  const { enabledFloors, toggleFloor, showNotification } =
    useBrowserNotification();

  const handleToggleFloor = async (floor: number) => {
    const result = await toggleFloor(floor);
    switch (result) {
      case "enabled":
        void showNotification(`${floor}층 품절 알림 활성화`, {
          body: `${floor}층 품절 발생 시 이 알림이 표시됩니다.`,
          icon: "/favicon.ico",
        });
        break;
      case "disabled":
        toast.info(`${floor}층 품절 알림이 꺼졌습니다`);
        break;
      case "denied":
        toast.error("브라우저 알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.");
        break;
    }
  };

  const getMachine = (floor: number, position: "left" | "right") =>
    machines.find((m) => m.floor === floor && m.position === position);

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-8">
          <div className="mb-8">
              <h1 className="text-xl font-bold tracking-tight">
                슬러시 기계 현황
              </h1>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                기계를 클릭하면 상태를 변경할 수 있습니다
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                (품절 알림 - iOS Safari 미지원)
              </p>
          </div>

          <div className="space-y-4">
          {FLOORS.map((floor) => (
            <div
              key={floor}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
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
                <div className="relative z-10 ml-auto flex items-center gap-1.5">
                  <Bell className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">품절 알림 (브라우저)</span>
                  <Switch
                    checked={enabledFloors.has(floor)}
                    onCheckedChange={() => void handleToggleFloor(floor)}
                  />
                </div>
              </div>

              {/* 좌우 탱크 패널 */}
              <div className="grid grid-cols-2 divide-x">
                <AdminTankPanel machine={getMachine(floor, "left")} />
                <AdminTankPanel machine={getMachine(floor, "right")} />
              </div>
            </div>
          ))}
          </div>
      </main>
    </div>
  );
}

/* ── 관리자용 탱크 패널 ── */

function AdminTankPanel({ machine }: { machine: Machine | undefined }) {
  if (!machine) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 p-4 text-muted-foreground">
        <IceCreamCone className="size-5 opacity-40" />
        <span className="text-xs opacity-60">미등록</span>
      </div>
    );
  }

  const colors = STATUS_COLORS[machine.status];

  return (
    <Link href={`/admin/edit/${machine.id}`}>
      <div
        className={cn(
          "flex flex-col p-3 cursor-pointer transition-all duration-300 hover:brightness-95 dark:hover:brightness-110",
          colors.bg
        )}
      >
        {/* 상단: 맛 + 상태 뱃지 (같은 행) */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-base font-bold truncate", colors.text)}>
            {machine.flavor || "\u00A0"}
          </p>
          <span
            className={cn(
              "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
              colors.badge
            )}
          >
            {STATUS_LABELS[machine.status]}
          </span>
        </div>

        {/* 하단: 부가 정보 */}
        <div className="mt-auto flex flex-col justify-end pt-3 gap-0.5">
          <p className={cn("text-xs", colors.text, "opacity-75")}>
            {machine.status === "cooling" && machine.cooling_end_at
              ? `냉각 종료 ${new Date(machine.cooling_end_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
              : "\u00A0"}
          </p>
          <p className={cn("text-xs", colors.text, "opacity-75")}>
            세척: {formatElapsedTime(machine.last_cleaned_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
