// 모든 시간은 UTC로 DB에 저장, 프론트엔드에서 KST 변환 표시

/** UTC ISO -> "X시간 Y분" 경과 시간 */
export function formatElapsedTime(utcIsoString: string | null): string {
  if (!utcIsoString) return "-";
  const diffMs = Date.now() - new Date(utcIsoString).getTime();
  if (diffMs < 0) return "-";
  if (diffMs < 60_000) return "방금 전";
  const totalMin = Math.floor(diffMs / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return m + "분 전";
  if (m === 0) return h + "시간 전";
  return h + "시간 " + m + "분 전";
}

/** cooling_end_at -> 남은 시간 문자열. 만료 시 null 반환 */
export function formatRemainingTime(
  coolingEndAt: string | null
): string | null {
  if (!coolingEndAt) return null;
  const diffMs = new Date(coolingEndAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const sec = Math.floor(diffMs / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return h + "시간 " + m + "분";
  if (m > 0) return m + "분 " + s + "초";
  return s + "초";
}

/** UTC ISO -> KST "YYYY. MM. DD. HH:mm" */
export function formatKST(utcIsoString: string): string {
  return new Date(utcIsoString).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 현재 시각 + coolingMinutes -> UTC ISO */
export function calculateCoolingEndAt(coolingMinutes: number): string {
  return new Date(Date.now() + coolingMinutes * 60_000).toISOString();
}
