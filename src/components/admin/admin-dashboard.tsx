"use client";

import Link from "next/link";
import { useMachines } from "@/hooks/use-machines";
import { useBrowserNotification } from "@/hooks/use-browser-notification";
import { AdminHeader } from "@/components/admin/admin-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const { isEnabled: notifEnabled, toggle, showNotification } =
    useBrowserNotification();

  const handleToggleNotif = async () => {
    const result = await toggle();
    switch (result) {
      case "enabled":
        void showNotification("슬러시 알림 활성화", {
          body: "품절 발생 시 이 알림이 표시됩니다.",
          icon: "/favicon.ico",
        });
        break;
      case "disabled":
        toast.info("품절 알림이 꺼졌습니다");
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
      <main className="flex-1 mx-auto max-w-lg px-4 py-8">
          <div className="mb-8 space-y-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                슬러시 기계 현황
              </h1>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                기계를 클릭하면 상태를 변경할 수 있습니다
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-muted-foreground" />
              <Label htmlFor="notif-toggle" className="text-sm">
                품절 브라우저 알림
              </Label>
              <Switch
                id="notif-toggle"
                checked={notifEnabled}
                onCheckedChange={() => void handleToggleNotif()}
              />
            </div>
          </div>

          <div className="space-y-4">
          {FLOORS.map((floor) => (
            <div
              key={floor}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              {/* 층 헤더 */}
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <h3 className="text-base font-semibold text-foreground">
                  {floor}층
                </h3>
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
