"use client";

import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionBannerProps {
  isConnected: boolean;
}

/**
 * Realtime 연결 상태 배너.
 * - 연결 끊김 시 경고 표시
 * - 재연결 시 잠깐 축하 메시지 표시 후 자동 사라짐
 */
export function ConnectionBanner({ isConnected }: ConnectionBannerProps) {
  const wasDisconnectedRef = useRef(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      wasDisconnectedRef.current = true;
      setShowReconnected(false);
    } else if (wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  if (showReconnected) {
    return (
      <div role="status" className="animate-reconnect-celebrate flex items-center justify-center gap-2 bg-green-500 px-3 py-2.5 text-sm font-medium text-white dark:bg-green-600 sm:px-4 sm:py-2">
        <Wifi className="size-4 shrink-0" />
        <span className="text-center">다시 연결됐어요! ✨</span>
      </div>
    );
  }

  if (isConnected) return null;

  return (
    <div role="alert" className="animate-banner-slide flex items-center justify-center gap-2 bg-yellow-400 px-3 py-2.5 text-sm font-medium text-yellow-900 dark:bg-yellow-600 dark:text-yellow-100 sm:px-4 sm:py-2">
      <WifiOff className="size-4 shrink-0" />
      <span className="text-center">실시간 연결이 끊어졌어요. 잠시 후 자동으로 다시 연결됩니다.</span>
    </div>
  );
}
