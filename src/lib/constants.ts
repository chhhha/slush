import type { MachineStatus } from "@/types";

// 상태별 색상 (Tailwind 클래스)
export const STATUS_COLORS: Record<
  MachineStatus,
  { bg: string; text: string; border: string; badge: string }
> = {
  preparing: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-300 dark:border-yellow-700",
    badge:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  cooling: {
    bg: "bg-blue-50 dark:bg-sky-950",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-100 text-blue-800 dark:bg-sky-900 dark:text-blue-200",
  },
  available: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-300 dark:border-green-700",
    badge:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  sold_out: {
    bg: "bg-slate-50 dark:bg-slate-950",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  },
  broken: {
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-300 dark:border-red-700",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export const STATUS_LABELS: Record<MachineStatus, string> = {
  preparing: "준비중",
  cooling: "냉각중",
  available: "이용가능",
  sold_out: "일시품절",
  broken: "고장",
};

export const POSITION_LABELS: Record<"left" | "right", string> = {
  left: "좌측",
  right: "우측",
};

export const FLOORS = [4, 3, 2] as const;


export const COOLDOWN_CONFIG = {
  COOLDOWN_MINUTES: 60,
} as const;

export const COOLING_CONFIG = {
  MIN_MINUTES: 1,
  MAX_MINUTES: 480,
} as const;

export const INPUT_LIMITS = {
  FLAVOR_MAX_LENGTH: 15,
  ANNOUNCEMENT_MAX_LENGTH: 500,
  MAX_EMAIL_RECIPIENTS_PER_MACHINE: 10,
} as const;

export const LOG_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 30, 50, 100, 200],
} as const;
