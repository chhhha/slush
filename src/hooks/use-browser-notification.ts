"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ENABLED_KEY = "slush_browser_notification_enabled";

/**
 * 브라우저 Notification API 래퍼 훅.
 */
export function useBrowserNotification() {
  // SSR과 클라이언트 초기값을 false로 통일하여 hydration 불일치 방지
  const [isEnabled, setIsEnabled] = useState(false);
  const isEnabledRef = useRef(false);

  // 클라이언트 마운트 후 localStorage에서 실제 상태 복원
  useEffect(() => {
    if ("Notification" in window) {
      const stored = localStorage.getItem(ENABLED_KEY);
      const enabled = stored === "true" && Notification.permission === "granted";
      setIsEnabled(enabled);
      isEnabledRef.current = enabled;
    }
  }, []);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  const toggle = useCallback(async (): Promise<"enabled" | "disabled" | "denied" | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";

    if (isEnabledRef.current) {
      localStorage.setItem(ENABLED_KEY, "false");
      isEnabledRef.current = false;
      setIsEnabled(false);
      return "disabled";
    }

    if (Notification.permission === "denied") return "denied";

    if (Notification.permission !== "granted") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      localStorage.setItem(ENABLED_KEY, "true");
      isEnabledRef.current = true;
      setIsEnabled(true);
      return "enabled";
    }

    return "denied";
  }, []);

  const notify = useCallback((title: string, body?: string) => {
    if (!isEnabledRef.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      new Notification(title, { body, icon: "/favicon.ico" });
    } catch {
      // 무시
    }
  }, []);

  return { isEnabled, toggle, notify };
}
