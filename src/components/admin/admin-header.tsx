"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, Settings, LogOut, CupSoda, Monitor } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/hooks/use-admin-session";

export function AdminHeader() {
  const router = useRouter();
  const { adminName } = useAdminSession();

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      toast.error("로그아웃에 실패했습니다");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <div className="flex flex-1 items-center">
          <div className="mr-2 inline-flex items-center gap-1.5 text-sm sm:text-base tracking-tight">
            <CupSoda className="size-4 text-primary" />
            <Link href="/admin" className="font-bold text-primary hover:opacity-80 transition-opacity">
              관리자
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Monitor className="size-3.5" />
              현황판
            </Link>
          </div>
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
            <span className="text-sm text-muted-foreground hidden sm:inline max-w-[120px] truncate">
              {adminName}
            </span>
          )}
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
  );
}
