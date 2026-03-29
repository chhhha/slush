"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Machine, EmailRecipient } from "@/types";
import { POSITION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface EmailSettingsViewProps {
  machines: Machine[];
}

/**
 * 이메일 수신자 관리 UI.
 * - 6개 통 선택 그리드
 * - 선택한 통의 수신자 목록 + 추가/삭제
 */
export function EmailSettingsView({ machines }: EmailSettingsViewProps) {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(
    machines[0] ?? null
  );
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchRecipients = useCallback(async (machineId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/machines/${machineId}/emails`);
      const json = await res.json();
      if (json.success) {
        setRecipients(json.data ?? []);
      }
    } catch {
      toast.error("수신자 목록 조회 실패");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      void fetchRecipients(selectedMachine.id);
    }
  }, [selectedMachine, fetchRecipients]);

  const handleAdd = async () => {
    if (!selectedMachine || !newEmail.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(
        `/api/admin/machines/${selectedMachine.id}/emails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newEmail.trim() }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("수신자가 추가되었습니다");
        setNewEmail("");
        void fetchRecipients(selectedMachine.id);
      } else {
        toast.error(json.error ?? "추가 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (recipientId: string) => {
    try {
      const res = await fetch(`/api/admin/emails/${recipientId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("수신자가 삭제되었습니다");
        if (selectedMachine) void fetchRecipients(selectedMachine.id);
      } else {
        toast.error(json.error ?? "삭제 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    }
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* 통 선택 그리드 */}
      <div className="md:w-56 md:shrink-0">
        <Label className="mb-2 block text-sm font-medium">기계 선택</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMachine(m)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                selectedMachine?.id === m.id
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <div className="font-medium">
                {m.floor}층 {POSITION_LABELS[m.position]}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {m.flavor}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedMachine && (
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium">
              {selectedMachine.floor}층 {POSITION_LABELS[selectedMachine.position]} 수신자 목록
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              일시품절 시 이메일을 받을 주소 (최대 10명)
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
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="truncate text-sm">{r.email}</span>
                  <button
                    onClick={() => void handleDelete(r.id)}
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
      )}
    </div>
  );
}
