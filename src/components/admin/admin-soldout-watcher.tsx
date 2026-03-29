"use client";

import { useMachines } from "@/hooks/use-machines";
import { useSoldoutNotification } from "@/hooks/use-soldout-notification";
import { useBrowserNotification } from "@/hooks/use-browser-notification";

/**
 * 모든 관리자 페이지에서 품절 브라우저 알림을 감시하는 컴포넌트.
 * 레이아웃에 배치되어 페이지 전환과 무관하게 동작한다.
 */
export function AdminSoldoutWatcher() {
  const { machines } = useMachines();
  const { notify } = useBrowserNotification();
  useSoldoutNotification(machines, notify);

  return null;
}
