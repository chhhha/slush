"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Machine, EmailRecipient } from "@/types";
import { FLOORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface EmailSettingsViewProps {
  machines: Machine[];
}

/** 층별 수신자 (같은 이메일이 여러 기계에 등록될 수 있으므로 ID 목록 보관) */
interface FloorRecipient {
  email: string;
  ids: string[];
}

/**
 * 이메일 수신자 관리 UI.
 * - 층별(2층/3층/4층) 선택
 * - 선택한 층의 수신자 목록 + 추가/삭제
 */
export function EmailSettingsView({ machines }: EmailSettingsViewProps) {
  const [selectedFloor, setSelectedFloor] = useState<number>(FLOORS[0]);
  const [recipients, setRecipients] = useState<FloorRecipient[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const getMachinesForFloor = useCallback(
    (floor: number) => machines.filter((m) => m.floor === floor),
    [machines]
  );

  // 층별 수신자 조회 (해당 층 모든 기계에서 합쳐서 중복 제거)
  const fetchRecipients = useCallback(
    async (floor: number) => {
      setIsLoading(true);
      try {
        const floorMachines = getMachinesForFloor(floor);
        const results = await Promise.all(
          floorMachines.map((m) =>
            fetch(`/api/admin/machines/${m.id}/emails`).then((res) => res.json())
          )
        );

        const emailMap = new Map<string, string[]>();
        for (const result of results) {
          if (result.success && result.data) {
            for (const r of result.data as EmailRecipient[]) {
              const ids = emailMap.get(r.email) ?? [];
              ids.push(r.id);
              emailMap.set(r.email, ids);
            }
          }
        }

        setRecipients(
          Array.from(emailMap.entries()).map(([email, ids]) => ({ email, ids }))
        );
      } catch {
        toast.error("수신자 목록 조회 실패");
      } finally {
        setIsLoading(false);
      }
    },
    [getMachinesForFloor]
  );

  useEffect(() => {
    void fetchRecipients(selectedFloor);
  }, [selectedFloor, fetchRecipients]);

  // 수신자 추가 (해당 층의 모든 기계에 추가)
  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setIsAdding(true);
    try {
      const floorMachines = getMachinesForFloor(selectedFloor);
      const results = await Promise.all(
        floorMachines.map((m) =>
          fetch(`/api/admin/machines/${m.id}/emails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: newEmail.trim() }),
          }).then((res) => res.json())
        )
      );

      const anySuccess = results.some((r: { success: boolean }) => r.success);
      const allConflict = results.every(
        (r: { success: boolean; error?: string }) =>
          !r.success && r.error?.includes("이미 등록된")
      );

      if (allConflict) {
        toast.error("이미 등록된 이메일 주소입니다");
      } else if (anySuccess) {
        toast.success("수신자가 추가되었습니다");
        setNewEmail("");
        void fetchRecipients(selectedFloor);
      } else {
        toast.error(results[0]?.error ?? "추가 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setIsAdding(false);
    }
  };

  // 수신자 삭제 (해당 이메일의 모든 기계 등록 삭제)
  const handleDelete = async (recipient: FloorRecipient) => {
    try {
      const results = await Promise.all(
        recipient.ids.map((id) =>
          fetch(`/api/admin/emails/${id}`, { method: "DELETE" }).then((res) =>
            res.json()
          )
        )
      );

      if (results.some((r: { success: boolean }) => r.success)) {
        toast.success("수신자가 삭제되었습니다");
        void fetchRecipients(selectedFloor);
      } else {
        toast.error("삭제 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    }
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* 층 선택 */}
      <div className="md:w-56 md:shrink-0">
        <Label className="mb-2 block text-sm font-medium">층 선택</Label>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
          {FLOORS.map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                selectedFloor === floor
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <div className="font-medium">{floor}층</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {getMachinesForFloor(floor)
                  .map((m) => m.flavor)
                  .join(", ")}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium">
            {selectedFloor}층 수신자 목록
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            일시품절 시 이메일을 받을 주소 (최대 10명)
            <br />
            하루 발송 최대 100건 제한이 있으므로, 꼭 필요한 분만 등록해주세요.
          </p>
        </div>

        {/* 수신자 목록 */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 수신자가 없습니다. 아래에서 이메일을 추가하세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recipients.map((r) => (
              <li
                key={r.email}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="truncate text-sm">{r.email}</span>
                <button
                  onClick={() => void handleDelete(r)}
                  className="ml-2 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors -mr-2"
                  aria-label="수신자 삭제"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 수신자 추가 */}
        {recipients.length < 10 && (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="이메일 주소 입력"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
              className="flex-1"
            />
            <Button
              onClick={() => void handleAdd()}
              disabled={isAdding || !newEmail.trim()}
              size="sm"
            >
              {isAdding ? "추가 중..." : "추가"}
            </Button>
          </div>
        )}
        {recipients.length >= 10 && (
          <Badge variant="secondary" className="self-start">
            최대 10명 도달
          </Badge>
        )}
      </div>
    </div>
  );
}
