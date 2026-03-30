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
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center">
              품절 제보가 일시 중지되었어요
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              관리자가 품절 제보 기능을 잠시 멈춰두었어요.
              <br />
              품절을 발견하셨다면, 각 층의 CA 또는 총무팀에
              <br />
              직접 알려주시면 빠르게 처리해 드릴게요!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>관리자에게 품절 제보하기</AlertDialogTitle>
          <AlertDialogDescription>
            헛걸음하게 해서 미안해요 😢
            <br />
            알려주시면 관리자가 빠르게 보충할게요!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // 기본 닫기 동작 방지 후 직접 처리
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? "전달하는 중... 🏃" : "네, 알려주세요!"}
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
