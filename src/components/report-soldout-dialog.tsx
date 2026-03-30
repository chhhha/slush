"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { collectIdentifiers } from "@/lib/utils/device-id";
import { fetchApi } from "@/lib/utils/api";
import type { Machine } from "@/types";

interface ReportSoldOutDialogProps {
  machine: Machine;
  /** 다이얼로그 열림 상태 (controlled) */
  open: boolean;
  /** 열림 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void;
  /** 품절 제보 기능 활성화 여부 */
  reportEnabled?: boolean;
}

/**
 * 품절 제보하기 확인 다이얼로그 (controlled 방식).
 * - 확인 시 /api/machines/[id]/report-soldout POST 호출
 * - 성공/실패 toast 표시
 */
export function ReportSoldOutDialog({
  machine,
  open,
  onOpenChange,
  reportEnabled = true,
}: ReportSoldOutDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      const { deviceId, fingerprint } = await collectIdentifiers();
      const result = await fetchApi(
        `/api/machines/${machine.id}/report-soldout`,
        {
          method: "POST",
          body: JSON.stringify({ deviceId, fingerprint }),
        }
      );

      if (result.success) {
        const messages = [
          "고마워요! 🙏 품절 소식을 관리자에게 전달했어요.",
          "알려줘서 고마워요! ❄️ 보충 요청 완료!",
          "품절 접수 완료! 🍧 관리자가 곧 확인할 거예요.",
        ];
        toast.success(messages[Math.floor(Math.random() * messages.length)]);
        onOpenChange(false);
      } else {
        toast.error(getErrorMessage(result.error));
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsPending(false);
    }
  };

  // 품절 제보 기능이 비활성화된 경우 안내 다이얼로그
  if (!reportEnabled) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>
              품절 제보 기능 일시 중지
            </AlertDialogTitle>
            <AlertDialogDescription>
              관리자가 이 기능을 잠시 멈춰두었어요.
              <br />
              슬러시가 비어있다면, 각 층의 CA 또는 총무에게
              <br />
              직접 알려주세요!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 다이얼로그가 닫힐 때 체크박스 초기화
  const handleOpenChange = (value: boolean) => {
    if (!value) setConfirmed(false);
    onOpenChange(value);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>관리자에게 품절 제보하기</AlertDialogTitle>
          <AlertDialogDescription>
            제보하시면 이 기계의 상태가 즉시 &lsquo;품절&rsquo;로 변경되며,
            <br />
            다른 직원들에게도 품절로 표시됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
          />
          <span className="text-sm text-muted-foreground">
            슬러시가 없는 것을 눈으로 확인했어요
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // 기본 닫기 동작 방지 후 직접 처리
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={isPending || !confirmed}
          >
            {isPending ? "전달하는 중... 🏃" : "네, 제보할게요!"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** API 오류를 사용자 친화적 메시지로 변환 */
function getErrorMessage(error?: string): string {
  if (!error) return "알 수 없는 오류가 발생했습니다.";
  if (error.includes("1시간")) {
    return error;
  }
  if (error.includes("429")) {
    return "잠시 후 다시 시도해주세요.";
  }
  if (error.includes("409")) {
    return "이미 품절로 변경된 상태예요.";
  }
  return error;
}
