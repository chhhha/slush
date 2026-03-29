"use client";

import { useEffect, useRef, useState } from "react";
import { formatRemainingTime } from "@/lib/utils/time";

interface UseCoolingTimerResult {
  remaining: string | null;
}

interface UseCoolingTimerOptions {
  coolingEndAt: string | null;
  onExpired?: () => void;
}

/**
 * cooling_end_at을 기준으로 1초 간격 카운트다운 훅.
 * tick 카운터로 리렌더를 유발하고, remaining은 렌더 시 계산.
 */
export function useCoolingTimer({
  coolingEndAt,
  onExpired,
}: UseCoolingTimerOptions): UseCoolingTimerResult {
  const [, setTick] = useState(0);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!coolingEndAt) {
      firedRef.current = false;
      return;
    }

    firedRef.current = false;

    const id = setInterval(() => {
      setTick((t) => t + 1);

      const rem = formatRemainingTime(coolingEndAt);
      if (rem === null && !firedRef.current) {
        firedRef.current = true;
        onExpiredRef.current?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [coolingEndAt]);

  // remaining은 렌더 시 계산 (setState 불필요)
  const remaining = coolingEndAt ? formatRemainingTime(coolingEndAt) : null;

  return { remaining };
}
