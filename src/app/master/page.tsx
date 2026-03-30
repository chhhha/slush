"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Lock, Power } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MasterPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 설정 상태
  const [reportEnabled, setReportEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // PIN 인증
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      toast.error("PIN을 입력해주세요");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/master/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthed(true);
        toast.success("인증 완료");
      } else {
        toast.error(data.error ?? "인증에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // 설정 조회
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/master/settings");
      const data = await res.json();
      if (data.success) {
        setReportEnabled(data.data.report_soldout_enabled);
      }
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    if (authed) void fetchSettings();
  }, [authed, fetchSettings]);

  // 토글
  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      const res = await fetch("/api/master/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_soldout_enabled: enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setReportEnabled(enabled);
        toast.success(
          enabled
            ? "품절 제보 기능이 활성화되었습니다"
            : "품절 제보 기능이 비활성화되었습니다",
        );
      } else {
        toast.error(data.error ?? "설정 변경에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsToggling(false);
    }
  };

  // PIN 로그인 화면
  if (!authed) {
    return (
      <div className="min-h-dvh flex items-start sm:items-center justify-center bg-muted/40 px-4 pt-[20vh] sm:pt-0">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="size-6 text-destructive" />
            </div>
            <CardTitle className="text-xl tracking-tight">
              마스터 관리
            </CardTitle>
            <CardDescription>
              개발자 전용 긴급 제어 패널입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="master-pin">PIN (6자리)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="master-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6자리 PIN 입력"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pl-9"
                    autoFocus
                    autoComplete="off"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                variant="destructive"
                disabled={isLoading}
              >
                {isLoading ? "인증 중..." : "인증하기"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 마스터 제어판
  return (
    <div className="min-h-dvh flex items-start sm:items-center justify-center bg-muted/40 px-4 pt-[20vh] sm:pt-0">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="size-6 text-destructive" />
          </div>
          <CardTitle className="text-xl tracking-tight">
            긴급 제어 패널
          </CardTitle>
          <CardDescription>
            사이트 기능을 긴급 제어할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 품절 제보 토글 */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    reportEnabled
                      ? "bg-green-100 dark:bg-green-950"
                      : "bg-red-100 dark:bg-red-950",
                  )}
                >
                  <Power
                    className={cn(
                      "size-5",
                      reportEnabled
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">품절 제보하기</p>
                  <p className="text-xs text-muted-foreground">
                    {reportEnabled
                      ? "직원들이 품절을 제보할 수 있습니다"
                      : "품절 제보 기능이 중지되었습니다"}
                  </p>
                </div>
              </div>
              <Switch
                checked={reportEnabled}
                onCheckedChange={handleToggle}
                disabled={isToggling}
              />
            </div>

            {!reportEnabled && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  현재 모든 사용자의 품절 제보가 차단된 상태입니다. 직원
                  페이지에서 버튼 클릭 시 안내 메시지가 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
