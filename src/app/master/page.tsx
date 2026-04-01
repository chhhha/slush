"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Lock, Power, ShieldCheck, UserPlus, X, LogOut, Megaphone } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { FaqManager } from "@/components/master/faq-manager";

interface AllowedName {
  id: number;
  name: string;
  created_at: string;
}

export default function MasterPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 설정 상태
  const [reportEnabled, setReportEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // 관리자 로그인 강화
  const [loginStrict, setLoginStrict] = useState(false);
  const [isTogglingStrict, setIsTogglingStrict] = useState(false);
  const [allowedNames, setAllowedNames] = useState<AllowedName[]>([]);
  const [newName, setNewName] = useState("");
  const [isAddingName, setIsAddingName] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 모든 관리자 로그아웃
  const [isForceLoggingOut, setIsForceLoggingOut] = useState(false);

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
        setLoginStrict(data.data.admin_login_strict);
      }
    } catch {
      // 무시
    }
  }, []);

  // 허용 이름 목록 조회
  const fetchAllowedNames = useCallback(async () => {
    try {
      const res = await fetch("/api/master/allowed-names");
      const data = await res.json();
      if (data.success) {
        setAllowedNames(data.data);
      }
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    if (authed) {
      void fetchSettings();
      void fetchAllowedNames();
    }
  }, [authed, fetchSettings, fetchAllowedNames]);

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

  // 관리자 로그인 강화 토글
  const handleToggleStrict = async (enabled: boolean) => {
    setIsTogglingStrict(true);
    try {
      const res = await fetch("/api/master/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_login_strict: enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setLoginStrict(enabled);
        toast.success(
          enabled
            ? "관리자 로그인 강화가 활성화되었습니다"
            : "관리자 로그인 강화가 비활성화되었습니다",
        );
      } else {
        toast.error(data.error ?? "설정 변경에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsTogglingStrict(false);
    }
  };

  // 허용 이름 추가
  const handleAddName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsAddingName(true);
    try {
      const res = await fetch("/api/master/allowed-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setAllowedNames((prev) => [...prev, data.data]);
        setNewName("");
        toast.success(`"${trimmed}" 이름이 추가되었습니다`);
      } else {
        toast.error(data.error ?? "추가에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsAddingName(false);
    }
  };

  // 허용 이름 삭제
  const handleDeleteName = async (id: number, name: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/master/allowed-names?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setAllowedNames((prev) => prev.filter((n) => n.id !== id));
        toast.success(`"${name}" 이름이 삭제되었습니다`);
      } else {
        toast.error(data.error ?? "삭제에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  // 모든 관리자 강제 로그아웃
  const handleForceLogout = async () => {
    setIsForceLoggingOut(true);
    try {
      const res = await fetch("/api/master/force-logout", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("모든 관리자가 로그아웃 처리되었습니다");
      } else {
        toast.error(data.error ?? "처리에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsForceLoggingOut(false);
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

          {/* 관리자 로그인 강화 토글 */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    loginStrict
                      ? "bg-green-100 dark:bg-green-950"
                      : "bg-gray-100 dark:bg-gray-900",
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "size-5",
                      loginStrict
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400",
                    )}
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">관리자 로그인 강화</p>
                  <p className="text-xs text-muted-foreground">
                    {loginStrict
                      ? "등록된 이름만 관리자 로그인 가능"
                      : "모든 이름으로 관리자 로그인 가능"}
                  </p>
                </div>
              </div>
              <Switch
                checked={loginStrict}
                onCheckedChange={handleToggleStrict}
                disabled={isTogglingStrict}
              />
            </div>

            {loginStrict && (
              <div className="space-y-3">
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-2">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    아래 목록에 등록된 이름만 관리자 로그인이 가능합니다. PIN이
                    맞더라도 이름이 등록되어 있지 않으면 로그인이 거부됩니다.
                  </p>
                </div>

                {/* 이름 추가 폼 */}
                <form onSubmit={handleAddName} className="flex gap-2">
                  <div className="relative flex-1">
                    <UserPlus className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="이름 입력"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={20}
                      className="pl-8 h-9 text-sm"
                      disabled={isAddingName}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9"
                    disabled={isAddingName || !newName.trim()}
                  >
                    {isAddingName ? "추가 중..." : "추가"}
                  </Button>
                </form>

                {/* 등록된 이름 목록 */}
                {allowedNames.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    등록된 이름이 없습니다. 이름을 추가해주세요.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {allowedNames.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-sm font-medium"
                        >
                          {item.name}
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full size-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleDeleteName(item.id, item.name)}
                            disabled={deletingId === item.id}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 공지사항 */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Megaphone className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">공지사항</p>
                <p className="text-xs text-muted-foreground">
                  직원 페이지에 표시되는 공지를 관리합니다
                </p>
              </div>
            </div>
            <AnnouncementForm
              adminName="마스터"
              apiBasePath="/api/master/announcements"
            />
          </div>

          {/* FAQ 관리 */}
          <div className="rounded-lg border p-4">
            <FaqManager />
          </div>

          {/* 모든 관리자 로그아웃 */}
          <div className="rounded-lg border border-destructive/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                  <LogOut className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">모든 관리자 로그아웃</p>
                  <p className="text-xs text-muted-foreground">
                    현재 로그인된 모든 관리자 세션을 즉시 만료시킵니다
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isForceLoggingOut}
                    />
                  }
                >
                  {isForceLoggingOut ? "처리 중..." : "실행"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      모든 관리자를 로그아웃하시겠습니까?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      현재 로그인된 모든 관리자의 세션이 즉시 만료됩니다. 관리자
                      페이지를 이용하려면 다시 로그인해야 합니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleForceLogout}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      모두 로그아웃
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
