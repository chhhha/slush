"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Faq } from "@/types";

const STORAGE_KEY = "slush_read_faq_ids";

function getReadIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function useFaqNotifications() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    setReadIds(getReadIds());

    fetch("/api/faqs")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFaqs(data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Realtime 구독: INSERT/DELETE 감지
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("faq-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "faqs" },
        (payload) => {
          setFaqs((prev) => [...prev, payload.new as Faq]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "faqs" },
        (payload) => {
          const deletedId = (payload.old as { id: number }).id;
          setFaqs((prev) => prev.filter((f) => f.id !== deletedId));
          // 삭제된 FAQ는 읽음 목록에서도 정리
          setReadIds((prev) => {
            if (!prev.has(deletedId)) return prev;
            const next = new Set(prev);
            next.delete(deletedId);
            saveReadIds(next);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadFaqIds = faqs
    .map((f) => f.id)
    .filter((id) => !readIds.has(id));

  const hasUnreadFaqs = unreadFaqIds.length > 0;

  const markAsRead = useCallback((id: number) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setFaqs((current) => {
      const allIds = new Set(current.map((f) => f.id));
      // 기존 읽음 ID도 유지
      setReadIds((prev) => {
        const next = new Set([...prev, ...allIds]);
        saveReadIds(next);
        return next;
      });
      return current;
    });
  }, []);

  return { faqs, isLoading, unreadFaqIds, hasUnreadFaqs, markAsRead, markAllAsRead };
}
