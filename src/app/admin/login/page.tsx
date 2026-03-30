"use client";

import { useState, useEffect, useCallback } from "react";
import { Lock, User } from "lucide-react";
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
import { toast } from "sonner";
import { getDeviceId } from "@/lib/utils/device-id";

export default function AdminLoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null,
  );

  // 잠금 카운트다운
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const formatCountdown = useCallback((seconds: number) => {
    if (seconds >= 60) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
    }
    return `${seconds}초`;
  }, []);

  const isLocked = lockoutSeconds > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
      toast.error("이름과 PIN을 모두 입력해주세요");
      return;
    }
    if (isLocked) return;

    setIsLoading(true);
    try {
      const deviceId = getDeviceId();
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin, deviceId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/admin";
      } else {
        if (data.retryAfterSeconds) {
          setLockoutSeconds(data.retryAfterSeconds);
        }
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        toast.error(data.error ?? "로그인에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-start sm:items-center justify-center bg-muted/40 px-4 pt-[20vh] sm:pt-0">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl tracking-tight">관리자 로그인</CardTitle>
          <CardDescription>슬러시 기계를 관리하려면 이름과 PIN을 입력하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="관리자 이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  autoFocus
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="PIN 번호"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isLocked}
            >
              {isLocked
                ? `${formatCountdown(lockoutSeconds)} 후 재시도`
                : isLoading
                  ? "로그인 중..."
                  : "로그인"}
            </Button>
            {remainingAttempts !== null && remainingAttempts > 0 && !isLocked && (
              <p className="text-center text-sm text-muted-foreground">
                남은 시도 횟수: {remainingAttempts}회
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
