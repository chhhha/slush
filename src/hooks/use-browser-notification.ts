"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ENABLED_FLOORS_KEY = "slush_notif_enabled_floors";
const OLD_ENABLED_KEY = "slush_browser_notification_enabled";

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

/** localStorage에서 알림 활성화된 층 목록 조회 (기존 전체 토글에서 자동 마이그레이션) */
function getEnabledFloors(): Set<number> {
  if (typeof window === "undefined") return new Set();
  const stored = localStorage.getItem(ENABLED_FLOORS_KEY);
  if (stored) {
    try {
      return new Set(JSON.parse(stored) as number[]);
    } catch {
      return new Set();
    }
  }
  // 기존 전체 토글에서 마이그레이션
  const oldValue = localStorage.getItem(OLD_ENABLED_KEY);
  if (oldValue === "true") {
    const allFloors = new Set([2, 3, 4]);
    localStorage.setItem(ENABLED_FLOORS_KEY, JSON.stringify([...allFloors]));
    localStorage.removeItem(OLD_ENABLED_KEY);
    return allFloors;
  }
  localStorage.removeItem(OLD_ENABLED_KEY);
  return new Set();
}

function saveEnabledFloors(floors: Set<number>) {
  localStorage.setItem(ENABLED_FLOORS_KEY, JSON.stringify([...floors]));
}

/**
 * 브라우저 Notification API 래퍼 훅 (층별 설정 지원).
 * Service Worker 기반으로 동작하여 모바일 브라우저 호환성 확보.
 */
export function useBrowserNotification() {
  // SSR과 클라이언트 초기값을 빈 Set으로 통일하여 hydration 불일치 방지
  const [enabledFloors, setEnabledFloors] = useState<Set<number>>(new Set());
  const enabledFloorsRef = useRef<Set<number>>(new Set());

  // 클라이언트 마운트 후 localStorage에서 실제 상태 복원 + SW 등록
  useEffect(() => {
    if ("Notification" in window) {
      const floors = Notification.permission === "granted" ? getEnabledFloors() : new Set<number>();
      setEnabledFloors(floors);
      enabledFloorsRef.current = floors;
    }
    void ensureSW();
  }, []);

  // 동일 탭 내 다른 훅 인스턴스와 알림 상태 동기화
  useEffect(() => {
    const syncState = () => {
      if ("Notification" in window) {
        const floors = Notification.permission === "granted" ? getEnabledFloors() : new Set<number>();
        setEnabledFloors(floors);
        enabledFloorsRef.current = floors;
      }
    };
    window.addEventListener("slush-notif-sync", syncState);
    return () => window.removeEventListener("slush-notif-sync", syncState);
  }, []);

  useEffect(() => {
    enabledFloorsRef.current = enabledFloors;
  }, [enabledFloors]);

  const toggleFloor = useCallback(async (floor: number): Promise<"enabled" | "disabled" | "denied" | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";

    const current = getEnabledFloors();

    if (current.has(floor)) {
      current.delete(floor);
      saveEnabledFloors(current);
      const next = new Set(current);
      setEnabledFloors(next);
      enabledFloorsRef.current = next;
      window.dispatchEvent(new Event("slush-notif-sync"));
      return "disabled";
    }

    if (Notification.permission === "denied") return "denied";

    if (Notification.permission !== "granted") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      current.add(floor);
      saveEnabledFloors(current);
      const next = new Set(current);
      setEnabledFloors(next);
      enabledFloorsRef.current = next;
      window.dispatchEvent(new Event("slush-notif-sync"));
      return "enabled";
    }

    return "denied";
  }, []);

  const notify = useCallback((title: string, body?: string, floor?: number) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (enabledFloorsRef.current.size === 0) return;
    if (floor !== undefined && !enabledFloorsRef.current.has(floor)) return;

    void showNotification(title, { body, icon: "/favicon.ico" });
  }, []);

  const isEnabled = enabledFloors.size > 0;

  return { isEnabled, enabledFloors, toggleFloor, notify, showNotification };
}
