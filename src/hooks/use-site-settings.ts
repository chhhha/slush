"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface SiteSettings {
  report_soldout_enabled: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = { report_soldout_enabled: true };

/**
 * site_settings 테이블을 실시간 구독하여 설정 변경을 감지한다.
 * 마운트 시 최신 설정을 fetch하고, Realtime으로 UPDATE를 수신한다.
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const fetchSettings = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("report_soldout_enabled")
      .eq("id", "global")
      .single();
    if (data) setSettings(data);
  }, []);

  useEffect(() => {
    void fetchSettings();

    const supabase = createClient();
    const channel = supabase
      .channel("site-settings-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_settings" },
        (payload) => {
          const row = payload.new as SiteSettings & { id: string };
          setSettings({ report_soldout_enabled: row.report_soldout_enabled });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return settings;
}
