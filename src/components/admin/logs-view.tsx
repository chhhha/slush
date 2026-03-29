"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Ban, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatKST } from "@/lib/utils/time";
import { STATUS_LABELS, STATUS_COLORS, POSITION_LABELS, LOG_CONFIG } from "@/lib/constants";
import { fetchApi } from "@/lib/utils/api";
import type { Machine, MachineStatus, BannedIdentifier } from "@/types";

interface LogEntry {
  id: number;
  machine_id: string;
  previous_status: MachineStatus | null;
  new_status: MachineStatus;
  changed_by_type: string;
  changed_by_name: string | null;
  device_id: string | null;
  ip_address: string | null;
  fingerprint: string | null;
  note: string | null;
  created_at: string;
  machines: {
    floor: number;
    position: "left" | "right";
    flavor: string;
  } | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface LogsViewProps {
  machines: Machine[];
}

type IdentifierType = BannedIdentifier["identifier_type"];

interface BanTarget {
  type: IdentifierType;
  value: string;
  label: string;
}

/**
 * 상태 변경 로그 테이블 뷰.
 * - 통 필터, KST 시각, 상태 Badge, 변경자, 페이지네이션
 * - 직원 신고 행에서 식별자 차단/해제 기능
 */
export function LogsView({ machines }: LogsViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(LOG_CONFIG.DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // 차단 관련 상태
  const [bannedSet, setBannedSet] = useState<Set<string>>(new Set());
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banPending, setBanPending] = useState(false);

  // 차단 목록 표시
  const [showBanList, setShowBanList] = useState(false);
  const [banList, setBanList] = useState<BannedIdentifier[]>([]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
      if (selectedMachineId !== "all") {
        params.set("machineId", selectedMachineId);
      }
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data ?? []);
        setPagination(json.pagination);
      } else {
        toast.error(json.error ?? "로그 조회 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMachineId, currentPage, pageSize]);

  const fetchBans = useCallback(async () => {
    const result = await fetchApi("/api/admin/bans");
    if (result.success && Array.isArray(result.data)) {
      const bans = result.data as BannedIdentifier[];
      setBanList(bans);
      setBannedSet(
        new Set(bans.map((b) => `${b.identifier_type}:${b.identifier_value}`))
      );
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    void fetchBans();
  }, [fetchLogs, fetchBans]);

  const handleMachineFilter = (value: string) => {
    setSelectedMachineId(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) return;
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const isBanned = (type: IdentifierType, value: string) =>
    bannedSet.has(`${type}:${value}`);

  const openBanDialog = (target: BanTarget) => {
    setBanTarget(target);
    setBanDialogOpen(true);
  };

  const handleBan = async () => {
    if (!banTarget) return;
    setBanPending(true);
    try {
      const result = await fetchApi("/api/admin/bans", {
        method: "POST",
        body: JSON.stringify({
          identifierType: banTarget.type,
          identifierValue: banTarget.value,
        }),
      });
      if (result.success) {
        toast.success(`${banTarget.label} 차단 완료`);
        setBanDialogOpen(false);
        void fetchBans();
      } else {
        toast.error(result.error ?? "차단 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setBanPending(false);
    }
  };

  const handleUnban = async (ban: BannedIdentifier) => {
    const result = await fetchApi(`/api/admin/bans/${ban.id}`, {
      method: "DELETE",
    });
    if (result.success) {
      toast.success("차단 해제 완료");
      void fetchBans();
    } else {
      toast.error(result.error ?? "차단 해제 실패");
    }
  };

  const machineLabel =
    selectedMachineId === "all"
      ? "전체"
      : (() => {
          const m = machines.find((m) => m.id === selectedMachineId);
          return m ? `${m.floor}층 ${POSITION_LABELS[m.position]}` : "전체";
        })();

  const changerLabel = (type: string, name: string | null) => {
    if (type === "system") return "시스템";
    if (type === "admin") return `관리자 (${name ?? "-"})`;
    return `직원 (${name ?? "-"})`;
  };

  /** 로그 행에서 차단 가능한 식별자 목록 추출 */
  const getBanTargets = (log: LogEntry): BanTarget[] => {
    const targets: BanTarget[] = [];
    if (log.device_id) {
      targets.push({
        type: "device_id",
        value: log.device_id,
        label: `기기 ID (${log.device_id.slice(0, 8)}...)`,
      });
    }
    if (log.ip_address && log.ip_address !== "unknown") {
      targets.push({
        type: "ip_address",
        value: log.ip_address,
        label: `IP (${log.ip_address})`,
      });
    }
    if (log.fingerprint) {
      targets.push({
        type: "fingerprint",
        value: log.fingerprint,
        label: `지문 (${log.fingerprint.slice(0, 8)}...)`,
      });
    }
    return targets;
  };

  const identifierTypeLabel = (type: IdentifierType) => {
    const labels: Record<IdentifierType, string> = {
      device_id: "기기 ID",
      ip_address: "IP",
      fingerprint: "지문",
      cookie_id: "쿠키 ID",
    };
    return labels[type];
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 + 차단 목록 토글 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Select
          value={selectedMachineId}
          onValueChange={(value) => handleMachineFilter(value ?? "all")}
        >
          <SelectTrigger className="w-36 sm:w-48">
            <SelectValue>{machineLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {machines.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.floor}층 {POSITION_LABELS[m.position]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-24 sm:w-28">
            <SelectValue>{pageSize}개씩</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LOG_CONFIG.PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}개씩
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {pagination ? `총 ${pagination.total}건` : ""}
        </span>
        <Button
          variant={showBanList ? "default" : "outline"}
          size="sm"
          className="ml-auto"
          onClick={() => setShowBanList(!showBanList)}
        >
          <Ban className="mr-1.5 size-3.5" />
          차단 목록{banList.length > 0 ? ` (${banList.length})` : ""}
        </Button>
      </div>

      {/* 차단 목록 패널 */}
      {showBanList && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold">차단된 식별자</h3>
          {banList.length === 0 ? (
            <p className="text-sm text-muted-foreground">차단된 항목이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {banList.map((ban) => (
                <div
                  key={ban.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {identifierTypeLabel(ban.identifier_type)}
                      </Badge>
                      <span className="truncate text-xs font-mono">
                        {ban.identifier_value}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ban.banned_by} | {formatKST(ban.created_at)}
                      {ban.reason ? ` | ${ban.reason}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => void handleUnban(ban)}
                  >
                    <ShieldOff className="mr-1 size-3.5" />
                    해제
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <ClipboardList className="size-8 opacity-40" />
          <p className="text-sm font-medium">아직 기록된 로그가 없어요</p>
          <p className="text-xs opacity-60">기계 상태가 변경되면 여기에 자동으로 기록됩니다</p>
        </div>
      ) : (
        <>
        {/* 모바일: 카드 레이아웃 */}
        <div className="flex flex-col gap-3 md:hidden">
          {logs.map((log) => {
            const targets = getBanTargets(log);
            return (
              <div key={log.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatKST(log.created_at)}
                  </span>
                  <span className="text-xs font-medium">
                    {log.machines
                      ? `${log.machines.floor}층 ${POSITION_LABELS[log.machines.position]}`
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {log.previous_status ? (
                    <Badge
                      className={STATUS_COLORS[log.previous_status].badge}
                      variant="outline"
                    >
                      {STATUS_LABELS[log.previous_status]}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge
                    className={STATUS_COLORS[log.new_status].badge}
                    variant="outline"
                  >
                    {STATUS_LABELS[log.new_status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{changerLabel(log.changed_by_type, log.changed_by_name)}</span>
                  {targets.length > 0 && (
                    <BanDropdown
                      targets={targets}
                      isBanned={isBanned}
                      onBan={openBanDialog}
                    />
                  )}
                </div>
                {log.note && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{log.note}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* 데스크톱: 테이블 레이아웃 */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">시각 (KST)</th>
                <th className="px-4 py-3 text-left font-medium">위치</th>
                <th className="px-4 py-3 text-left font-medium">변경 전</th>
                <th className="px-4 py-3 text-left font-medium">변경 후</th>
                <th className="px-4 py-3 text-left font-medium">변경자</th>
                <th className="px-4 py-3 text-left font-medium">기기/IP</th>
                <th className="min-w-[200px] px-4 py-3 text-left font-medium">비고</th>
                <th className="px-4 py-3 text-left font-medium">차단</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => {
                const targets = getBanTargets(log);
                return (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatKST(log.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {log.machines
                        ? `${log.machines.floor}층 ${POSITION_LABELS[log.machines.position]}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {log.previous_status ? (
                        <Badge
                          className={STATUS_COLORS[log.previous_status].badge}
                          variant="outline"
                        >
                          {STATUS_LABELS[log.previous_status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={STATUS_COLORS[log.new_status].badge}
                        variant="outline"
                      >
                        {STATUS_LABELS[log.new_status]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {changerLabel(log.changed_by_type, log.changed_by_name)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground break-all">
                      {log.device_id ?? "-"}
                      {log.ip_address ? ` / ${log.ip_address}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.note ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {targets.length > 0 ? (
                        <BanDropdown
                          targets={targets}
                          isBanned={isBanned}
                          onBan={openBanDialog}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {currentPage} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={currentPage >= pagination.totalPages || isLoading}
          >
            다음
          </Button>
        </div>
      )}

      {/* 차단 확인 다이얼로그 */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>식별자 차단</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{banTarget?.label}</strong>을(를) 영구 차단하시겠습니까?
              <br />
              차단된 사용자는 품절 알림을 보낼 수 없게 됩니다.
              <br />
              <span className="text-xs opacity-70">(차단 사실은 해당 사용자에게 노출되지 않습니다)</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleBan();
              }}
              disabled={banPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {banPending ? "처리 중..." : "차단"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── 차단 드롭다운 메뉴 ───

function BanDropdown({
  targets,
  isBanned,
  onBan,
}: {
  targets: BanTarget[];
  isBanned: (type: IdentifierType, value: string) => boolean;
  onBan: (target: BanTarget) => void;
}) {
  const allBanned = targets.every((t) => isBanned(t.type, t.value));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted ${allBanned ? "text-destructive" : "text-muted-foreground"}`}
      >
        <Ban className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {targets.map((target) => {
          const banned = isBanned(target.type, target.value);
          return (
            <DropdownMenuItem
              key={`${target.type}:${target.value}`}
              disabled={banned}
              onClick={() => !banned && onBan(target)}
            >
              <Ban className="mr-2 size-3.5" />
              {target.label}
              {banned && (
                <Badge variant="outline" className="ml-2 text-xs text-destructive">
                  차단됨
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
