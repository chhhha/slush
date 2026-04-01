"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { INPUT_LIMITS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/types";

interface AnnouncementFormProps {
  adminName: string;
  apiBasePath?: string;
  onSuccess?: () => void;
}

/**
 * 관리자 공지 작성 폼 + 현재 활성 공지 표시/수정/비활성화.
 * - 활성 공지가 있으면 내용 표시 + 수정/비활성화 버튼
 * - Realtime 구독으로 상태 자동 갱신
 */
export function AnnouncementForm({ adminName, apiBasePath = "/api/admin/announcements", onSuccess }: AnnouncementFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const supabaseRef = useRef(createClient());

  const maxLength = INPUT_LIMITS.ANNOUNCEMENT_MAX_LENGTH;
  const remaining = maxLength - content.length;
  const isOverLimit = remaining < 0;
  const editRemaining = maxLength - editContent.length;
  const isEditOverLimit = editRemaining < 0;

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(apiBasePath);
      const json = await res.json();
      if (json.success) {
        // 최신 활성 공지 1건만
        setActiveAnnouncement(json.data?.[0] ?? null);
      }
    } catch {
      // 네트워크 오류 시 무시
    }
  }, []);

  useEffect(() => {
    void fetchActive();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("admin-announcements-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => void fetchActive()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchActive]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("공지 내용을 입력해주세요");
      return;
    }
    if (isOverLimit) {
      toast.error(`${maxLength}자 이내로 입력해주세요`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), createdBy: adminName }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("공지가 등록되었습니다");
        setContent("");
        onSuccess?.();
      } else {
        toast.error(json.error ?? "공지 등록에 실패했습니다");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activeAnnouncement) return;

    setIsDeactivating(true);
    try {
      const res = await fetch(`${apiBasePath}/${activeAnnouncement.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("공지 팝업이 비활성화되었습니다");
        setIsEditing(false);
      } else {
        toast.error(json.error ?? "비활성화에 실패했습니다");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleStartEdit = () => {
    if (!activeAnnouncement) return;
    setEditContent(activeAnnouncement.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleUpdate = async () => {
    if (!activeAnnouncement || !editContent.trim()) return;
    if (isEditOverLimit) {
      toast.error(`${maxLength}자 이내로 입력해주세요`);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`${apiBasePath}/${activeAnnouncement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("공지가 수정되었습니다");
        setIsEditing(false);
        setEditContent("");
      } else {
        toast.error(json.error ?? "공지 수정에 실패했습니다");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 현재 활성 공지 */}
      {activeAnnouncement && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-primary">
              현재 활성 공지
            </span>
            <div className="flex gap-1.5">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="h-7 text-xs"
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  수정
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                {isDeactivating ? "처리 중..." : "팝업 비활성화"}
              </Button>
            </div>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="resize-none"
                maxLength={maxLength + 10}
                autoFocus
              />
              <p
                className={cn(
                  "text-right text-xs tabular-nums",
                  isEditOverLimit ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {editContent.length} / {maxLength}
              </p>
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="h-7 text-xs"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating || !editContent.trim() || isEditOverLimit}
                  className="h-7 text-xs"
                >
                  {isUpdating ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {activeAnnouncement.content}
            </p>
          )}
        </div>
      )}

      {/* 새 공지 작성 */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="announcement-content">공지 내용</Label>
        <Textarea
          id="announcement-content"
          placeholder="공지 내용을 입력하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="resize-none"
          maxLength={maxLength + 10}
        />
        <p
          className={cn(
            "text-right text-xs tabular-nums",
            isOverLimit ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {content.length} / {maxLength}
        </p>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !content.trim() || isOverLimit}
        className="self-end"
      >
        {isSubmitting ? "공지 중..." : "공지하기"}
      </Button>
    </div>
  );
}
