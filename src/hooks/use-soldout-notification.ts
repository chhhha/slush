"use client";

import { useEffect, useRef } from "react";
import type { Machine } from "@/types";
import { POSITION_LABELS } from "@/lib/constants";

/**
 * 일시품절 감지 브라우저 알림 훅.
 * - machines 배열의 상태 변화를 감시
 * - prevStatusRef로 이전 상태 추적
 * - available/preparing/cooling → sold_out 전환 시 브라우저 알림 발송
 *
 * notify는 호출측의 useBrowserNotification에서 받아 전달해야
 * 토글 상태가 정확히 반영됩니다.
 */
export function useSoldoutNotification(
  machines: Machine[],
  notify: (title: string, body?: string, floor?: number) => void,
) {
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const prev = prevStatusRef.current;

    for (const machine of machines) {
      const prevStatus = prev.get(machine.id);

      // 이전 상태가 있고, 현재 상태가 sold_out이며, 이전 상태가 sold_out이 아닐 때만 알림
      if (
        prevStatus !== undefined &&
        machine.status === "sold_out" &&
        prevStatus !== "sold_out"
      ) {
        const positionLabel = POSITION_LABELS[machine.position];
        notify(
          `[슬러시 일시품절] ${machine.floor}층 ${positionLabel}`,
          `${machine.flavor} 슬러시가 일시품절되었습니다`,
          machine.floor
        );
      }

      // 현재 상태를 이전 상태로 기록
      prev.set(machine.id, machine.status);
    }
  }, [machines, notify]);
}
