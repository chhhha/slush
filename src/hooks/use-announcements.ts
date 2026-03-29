"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/types";

interface UseAnnouncementsResult {
  announcement: Announcement | null;
  isLoading: boolean;
}

/**
 * 활성 공지를 조회하고 Realtime으로 변경사항을 구독하는 훅.
 * - announcements 테이블의 INSERT/UPDATE 이벤트 감지 시 fetchActive() 재호출
 */
export function useAnnouncements(): UseAnnouncementsResult {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchActive = async () => {
    try {
      const res = await fetch("/api/announcements/active");
      const json = await res.json();
      if (json.success) {
        setAnnouncement(json.data ?? null);
      }
    } catch {
      // 네트워크 오류 시 기존 상태 유지
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchActive();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("announcements-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "announcements",
        },
        () => {
          void fetchActive();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "announcements",
        },
        () => {
          void fetchActive();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { announcement, isLoading };
}
