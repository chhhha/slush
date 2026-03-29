"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldOff, ShieldBan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatKST } from "@/lib/utils/time";
import { fetchApi } from "@/lib/utils/api";
import type { BannedIdentifier } from "@/types";

const TYPE_LABELS: Record<BannedIdentifier["identifier_type"], string> = {
  device_id: "기기 ID",
  ip_address: "IP 주소",
  fingerprint: "브라우저 지문",
  cookie_id: "쿠키 ID",
};

export function BanListView() {
  const [bans, setBans] = useState<BannedIdentifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBans = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchApi("/api/admin/bans");
      if (result.success && Array.isArray(result.data)) {
        setBans(result.data as BannedIdentifier[]);
      }
    } catch {
      toast.error("차단 목록을 불러오지 못했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBans();
  }, [fetchBans]);

  const handleUnban = async (ban: BannedIdentifier) => {
    const result = await fetchApi(`/api/admin/bans/${ban.id}`, {
      method: "DELETE",
    });
    if (result.success) {
      toast.success("차단이 해제되었습니다");
      void fetchBans();
    } else {
      toast.error(result.error ?? "차단 해제에 실패했습니다");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  if (bans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <ShieldBan className="size-8 opacity-40" />
        <p className="text-sm font-medium">차단된 항목이 없습니다</p>
        <p className="text-xs opacity-60">
          로그 페이지에서 의심스러운 식별자를 차단할 수 있어요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {bans.map((ban) => (
        <div
          key={ban.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="shrink-0 text-xs">
                {TYPE_LABELS[ban.identifier_type]}
              </Badge>
              <span className="truncate font-mono text-sm">
                {ban.identifier_value}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ban.banned_by} 님이 차단 | {formatKST(ban.created_at)}
              {ban.reason ? ` | 사유: ${ban.reason}` : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void handleUnban(ban)}
          >
            <ShieldOff className="mr-1.5 size-3.5" />
            해제
          </Button>
        </div>
      ))}
    </div>
  );
}
