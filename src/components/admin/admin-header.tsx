"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, Settings, LogOut, CupSoda } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/hooks/use-admin-session";

export function AdminHeader() {
  const router = useRouter();
  const { adminName, refresh } = useAdminSession();
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleNameSave() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/admin/auth/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        toast.error("이름 변경에 실패했습니다");
        return;
      }
      await refresh();
      setNameDialogOpen(false);
      toast.success("이름이 변경되었습니다");
    } catch {
      toast.error("이름 변경에 실패했습니다");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      toast.error("로그아웃에 실패했습니다");
    }
  }

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <div className="flex flex-1 items-center">
          <Link href="/admin" className="mr-2 inline-flex items-center gap-1.5 font-bold text-sm sm:text-base tracking-tight text-primary hover:opacity-80 transition-opacity">
            <CupSoda className="size-4" />
            슬러시 관리자
          </Link>
        </div>
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex items-center gap-1.5 min-h-11 min-w-11 sm:min-w-0 justify-center sm:justify-start")}
          >
            <LayoutDashboard className="size-4" />
            <span className="hidden sm:inline">대시보드</span>
          </Link>
          <Link
            href="/admin/logs"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex items-center gap-1.5 min-h-11 min-w-11 sm:min-w-0 justify-center sm:justify-start")}
          >
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">로그</span>
          </Link>
          <Link
            href="/admin/settings"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex items-center gap-1.5 min-h-11 min-w-11 sm:min-w-0 justify-center sm:justify-start")}
          >
            <Settings className="size-4" />
            <span className="hidden sm:inline">설정</span>
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
          {adminName && (
            <button
              type="button"
              onClick={() => { setNewName(adminName); setNameDialogOpen(true); }}
              className="text-sm text-muted-foreground hidden sm:inline max-w-[120px] truncate hover:text-foreground transition-colors cursor-pointer"
              title="이름 변경"
            >
              {adminName}
            </button>
          )}
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "min-h-9 min-w-9")}
            title="현황판"
          >
            <CupSoda className="size-4" />
          </Link>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1.5 min-h-11 min-w-11 sm:min-w-0 justify-center sm:justify-start text-destructive hover:text-destructive"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>

    <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>이름 변경</DialogTitle>
        </DialogHeader>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
          placeholder="새 이름 입력"
          maxLength={20}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setNameDialogOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={handleNameSave} disabled={!newName.trim()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
