"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AdminSession {
  adminName: string;
  isLoading: boolean;
}

/**
 * 관리자 세션을 JWT 기반으로 검증하는 훅.
 * 세션이 무효하면 로그인 페이지로 자동 리다이렉트한다.
 */
export function useAdminSession(): AdminSession {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const verify = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (!res.ok) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      setAdminName(data.name ?? "");
    } catch {
      router.replace("/admin/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    verify();
  }, [verify]);

  return { adminName, isLoading };
}
