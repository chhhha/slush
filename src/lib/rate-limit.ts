// 관리자 로그인 브루트포스 방지 - 2계층 rate limiting
// 1계층: 글로벌 요청 간격 제한 (최소 2초)
// 2계층: Device ID별 실패 횟수 추적 (5회 후 점진적 잠금)

const GLOBAL_MIN_INTERVAL_MS = 2_000;

const MAX_FREE_ATTEMPTS = 5;

// 5회 초과 후 점진적 잠금 시간 (초)
const LOCKOUT_SECONDS = [15, 30, 60, 120, 300, 900] as const;

interface DeviceRecord {
  failCount: number;
  lastFailedAt: number;
}

const deviceRecords = new Map<string, DeviceRecord>();
let lastGlobalAttemptAt = 0;

// 1시간 이상 된 기록 자동 정리
const CLEANUP_INTERVAL_MS = 10 * 60 * 1_000; // 10분마다
const RECORD_TTL_MS = 60 * 60 * 1_000; // 1시간
let lastCleanupAt = Date.now();

function cleanupStaleRecords() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  for (const [id, record] of deviceRecords) {
    if (now - record.lastFailedAt > RECORD_TTL_MS) {
      deviceRecords.delete(id);
    }
  }
}

/** 점진적 잠금 대기 시간(초) 계산. 잠금 없으면 0 반환. */
function getLockoutSeconds(failCount: number): number {
  if (failCount < MAX_FREE_ATTEMPTS) return 0;
  const index = Math.min(
    failCount - MAX_FREE_ATTEMPTS,
    LOCKOUT_SECONDS.length - 1,
  );
  return LOCKOUT_SECONDS[index]!;
}

export interface RateLimitResult {
  allowed: boolean;
  /** 재시도까지 남은 대기 시간(초). allowed가 true이면 0. */
  retryAfterSeconds: number;
  /** "global" | "device" - 어떤 제한에 걸렸는지 */
  reason?: "global" | "device";
  /** 현재 실패 횟수 */
  failCount: number;
  /** 잠금 전 남은 무료 시도 횟수 */
  remainingAttempts: number;
}

/** 로그인 시도 전 호출. 허용 여부와 대기 시간 반환. */
export function checkRateLimit(deviceId: string): RateLimitResult {
  cleanupStaleRecords();

  const now = Date.now();
  const record = deviceRecords.get(deviceId);
  const failCount = record?.failCount ?? 0;
  const remainingAttempts = Math.max(0, MAX_FREE_ATTEMPTS - failCount);

  // 1계층: 글로벌 간격 제한
  const globalElapsed = now - lastGlobalAttemptAt;
  if (globalElapsed < GLOBAL_MIN_INTERVAL_MS) {
    const retryAfterSeconds = Math.ceil(
      (GLOBAL_MIN_INTERVAL_MS - globalElapsed) / 1_000,
    );
    return {
      allowed: false,
      retryAfterSeconds,
      reason: "global",
      failCount,
      remainingAttempts,
    };
  }

  // 2계층: Device ID별 잠금 확인
  if (record && failCount >= MAX_FREE_ATTEMPTS) {
    const lockoutSec = getLockoutSeconds(failCount);
    const elapsed = (now - record.lastFailedAt) / 1_000;
    if (elapsed < lockoutSec) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(lockoutSec - elapsed),
        reason: "device",
        failCount,
        remainingAttempts: 0,
      };
    }
  }

  // 글로벌 타임스탬프 갱신 (허용 시에만)
  lastGlobalAttemptAt = now;

  return { allowed: true, retryAfterSeconds: 0, failCount, remainingAttempts };
}

/** 로그인 실패 시 호출 */
export function recordFailure(deviceId: string): void {
  const now = Date.now();
  const record = deviceRecords.get(deviceId);
  if (record) {
    record.failCount += 1;
    record.lastFailedAt = now;
  } else {
    deviceRecords.set(deviceId, { failCount: 1, lastFailedAt: now });
  }
}

/** 로그인 성공 시 호출 */
export function recordSuccess(deviceId: string): void {
  deviceRecords.delete(deviceId);
}

/** 현재 실패 상태 조회 (rate limit 체크 없이) */
export function getFailureStatus(deviceId: string): {
  failCount: number;
  remainingAttempts: number;
} {
  const record = deviceRecords.get(deviceId);
  const failCount = record?.failCount ?? 0;
  return {
    failCount,
    remainingAttempts: Math.max(0, MAX_FREE_ATTEMPTS - failCount),
  };
}
