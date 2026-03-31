"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAdminSession } from "@/hooks/use-admin-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STATUS_LABELS, INPUT_LIMITS } from "@/lib/constants";
import { formatElapsedTime } from "@/lib/utils/time";
import type { Machine, MachineStatus } from "@/types";

const STATUS_OPTIONS: MachineStatus[] = [
  "preparing",
  "cooling",
  "available",
  "sold_out",
  "broken",
];

interface MachineEditFormProps {
  machine: Machine;
}

export function MachineEditForm({ machine }: MachineEditFormProps) {
  const router = useRouter();
  const { adminName } = useAdminSession();
  const [status, setStatus] = useState<MachineStatus>(machine.status);
  const [coolingMinutes, setCoolingMinutes] = useState<string>("30");
  const [flavor, setFlavor] = useState(machine.flavor ?? "");
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [isFlavorSaving, setIsFlavorSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [lastCleanedAt, setLastCleanedAt] = useState(machine.last_cleaned_at);

  // 실시간 구독 - 충돌 감지
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`machine-edit-${machine.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "machines",
          filter: `id=eq.${machine.id}`,
        },
        (payload) => {
          const updated = payload.new as Machine;
          // 다른 관리자가 변경한 경우 경고
          if (updated.updated_by && updated.updated_by !== adminName) {
            toast.warning(
              `${updated.updated_by}님이 이 기계의 상태를 변경했습니다. 페이지를 새로고침하세요.`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [machine.id, adminName]);

  async function handleStatusSave() {
    if (!adminName) {
      toast.error("관리자 이름을 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }
    if (status === "cooling" && (!coolingMinutes || Number(coolingMinutes) < 1)) {
      toast.error("냉각 시간을 1분 이상 입력해주세요");
      return;
    }

    setIsStatusSaving(true);
    try {
      const res = await fetch(`/api/admin/machines/${machine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          coolingMinutes: status === "cooling" ? Number(coolingMinutes) : undefined,
          adminName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("상태가 저장되었습니다");
      } else {
        toast.error(data.error ?? "저장에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsStatusSaving(false);
    }
  }

  async function handleFlavorSave() {
    if (!adminName) {
      toast.error("관리자 이름을 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    setIsFlavorSaving(true);
    try {
      const res = await fetch(`/api/admin/machines/${machine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flavor, adminName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("맛이 저장되었습니다");
      } else {
        toast.error(data.error ?? "저장에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsFlavorSaving(false);
    }
  }

  async function handleClean() {
    if (!adminName) {
      toast.error("관리자 이름을 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    setIsCleaning(true);
    try {
      const res = await fetch(`/api/admin/machines/${machine.id}/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("세척 시간이 초기화 되었습니다.");
        setLastCleanedAt(new Date().toISOString());
      } else {
        toast.error(data.error ?? "처리에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsCleaning(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 상태 변경 카드 — 주요 액션 */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-base shrink-0">상태 변경</CardTitle>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MachineStatus)}
            >
              <SelectTrigger id="status" className="flex-1">
                <SelectValue>{STATUS_LABELS[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {status === "cooling" && (
            <div className="space-y-2">
              <Label htmlFor="cooling-minutes">냉각 시간 (분)</Label>
              <Input
                id="cooling-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={480}
                value={coolingMinutes}
                onChange={(e) => setCoolingMinutes(e.target.value)}
                placeholder="예: 30"
              />
            </div>
          )}

          <Button
            onClick={handleStatusSave}
            disabled={isStatusSaving}
            className="w-full"
          >
            {isStatusSaving ? "저장 중..." : "상태 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* 맛 변경 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">맛 변경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              id="flavor"
              type="text"
              maxLength={INPUT_LIMITS.FLAVOR_MAX_LENGTH}
              value={flavor}
              onChange={(e) => setFlavor(e.target.value)}
              placeholder="예: 딸기"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {flavor.length}/{INPUT_LIMITS.FLAVOR_MAX_LENGTH}
            </span>
          </div>
          <Button
            onClick={handleFlavorSave}
            disabled={isFlavorSaving}
            className="w-full"
          >
            {isFlavorSaving ? "저장 중..." : "맛 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* 세척 관리 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">세척 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">마지막 세척</span>
            <span className="font-medium">
              {lastCleanedAt
                ? formatElapsedTime(lastCleanedAt)
                : "기록 없음"}
            </span>
          </div>
          <Button
            onClick={() => setShowCleanConfirm(true)}
            disabled={isCleaning}
            className="w-full"
          >
            {isCleaning ? "처리 중..." : "세척 시간 초기화"}
          </Button>

          <AlertDialog open={showCleanConfirm} onOpenChange={setShowCleanConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>세척 시간 초기화</AlertDialogTitle>
                <AlertDialogDescription>
                  지금 세척을 완료한 것으로 기록할까요?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowCleanConfirm(false);
                    handleClean();
                  }}
                >
                  기록하기
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* 뒤로가기 */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => router.push("/admin")}
      >
        대시보드로 돌아가기
      </Button>
    </div>
  );
}
