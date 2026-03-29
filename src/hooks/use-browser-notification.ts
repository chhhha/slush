"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ENABLED_KEY = "slush_browser_notification_enabled";

/**
 * SW 등록 후 registration을 캐싱.
 * 모바일 브라우저(삼성 인터넷 등)에서는 new Notification()이 동작하지 않으므로
 * ServiceWorkerRegistration.showNotification()을 사용해야 한다.
 */
let swRegistration: ServiceWorkerRegistration | null = null;

/** SW가 active 상태가 될 때까지 대기 */
function waitForActive(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (reg.active) return Promise.resolve(reg);
  const worker = reg.installing || reg.waiting;
  if (!worker) return Promise.resolve(reg);
  return new Promise((resolve) => {
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve(reg);
    });
  });
}

async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration?.active) return swRegistration;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    swRegistration = await waitForActive(reg);
    return swRegistration;
  } catch {
    return null;
  }
}

/**
 * 브라우저 알림을 SW 기반으로 발송하는 함수.
 * SW를 사용할 수 없는 환경에서는 fallback으로 new Notification() 시도.
 */
async function showNotification(title: string, options?: NotificationOptions) {
  const reg = await ensureSW();
  if (reg) {
    await reg.showNotification(title, options);
  } else if ("Notification" in window) {
    new Notification(title, options);
  }
}

/**
 * 브라우저 Notification API 래퍼 훅.
 * Service Worker 기반으로 동작하여 모바일 브라우저 호환성 확보.
 */
export function useBrowserNotification() {
  // SSR과 클라이언트 초기값을 false로 통일하여 hydration 불일치 방지
  const [isEnabled, setIsEnabled] = useState(false);
  const isEnabledRef = useRef(false);

  // 클라이언트 마운트 후 localStorage에서 실제 상태 복원 + SW 등록
  useEffect(() => {
    if ("Notification" in window) {
      const stored = localStorage.getItem(ENABLED_KEY);
      const enabled = stored === "true" && Notification.permission === "granted";
      setIsEnabled(enabled);
      isEnabledRef.current = enabled;
    }
    // SW 미리 등록
    void ensureSW();
  }, []);

  // 동일 탭 내 다른 훅 인스턴스와 알림 상태 동기화
  useEffect(() => {
    const syncState = () => {
      if ("Notification" in window) {
        const stored = localStorage.getItem(ENABLED_KEY);
        const enabled = stored === "true" && Notification.permission === "granted";
        setIsEnabled(enabled);
        isEnabledRef.current = enabled;
      }
    };
    window.addEventListener("slush-notif-sync", syncState);
    return () => window.removeEventListener("slush-notif-sync", syncState);
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
      window.dispatchEvent(new Event("slush-notif-sync"));
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
      window.dispatchEvent(new Event("slush-notif-sync"));
      return "enabled";
    }

    return "denied";
  }, []);

  const notify = useCallback((title: string, body?: string) => {
    if (!isEnabledRef.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    void showNotification(title, { body, icon: "/favicon.ico" });
  }, []);

  return { isEnabled, toggle, notify, showNotification };
}
