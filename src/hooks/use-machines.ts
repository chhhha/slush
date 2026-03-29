"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Machine } from "@/types";

export function useMachines(initialMachines: Machine[] = []) {
  const [machines, setMachines] = useState<Machine[]>(initialMachines);

  const fetchMachines = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("machines")
      .select("*")
      .order("floor", { ascending: true });
    if (data) setMachines(data);
  }, []);

  useEffect(() => {
    // 마운트 시 최신 데이터 fetch (Next.js 라우터 캐시로 인한 stale 데이터 방지)
    void fetchMachines();

    const supabase = createClient();

    const channel = supabase
      .channel("machines-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "machines" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setMachines((prev) =>
              prev.map((m) =>
                m.id === (payload.new as Machine).id
                  ? (payload.new as Machine)
                  : m
              )
            );
          } else if (payload.eventType === "INSERT") {
            setMachines((prev) => [...prev, payload.new as Machine]);
          } else if (payload.eventType === "DELETE") {
            setMachines((prev) =>
              prev.filter((m) => m.id !== (payload.old as Machine).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMachines]);

  // bfcache 복원 또는 탭 복귀 시 최신 데이터로 갱신
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void fetchMachines();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchMachines();
    };
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchMachines]);

  return { machines, refetch: fetchMachines };
}
