"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAnnouncements } from "@/hooks/use-announcements";

const DISMISSED_KEY = "slush_dismissed_announcements";

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addDismissedId(id: string): void {
  try {
    const ids = getDismissedIds();
    if (!ids.includes(id)) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids, id]));
    }
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

/** 외부 래퍼: announcement ID가 바뀌면 key로 내부 컴포넌트 리마운트 */
export function AnnouncementPopup() {
  const { announcement } = useAnnouncements();

  const shouldShow = useMemo(() => {
    if (!announcement) return false;
    const dismissed = getDismissedIds();
    return !dismissed.includes(announcement.id);
  }, [announcement]);

  if (!announcement || !shouldShow) return null;

  // key로 announcement.id를 사용하면 새 공지 시 자동 리마운트 → manualClosed 초기화
  return (
    <AnnouncementDialog
      key={announcement.id}
      announcement={announcement}
    />
  );
}

interface AnnouncementDialogProps {
  announcement: { id: string; content: string };
}

function AnnouncementDialog({ announcement }: AnnouncementDialogProps) {
  const [open, setOpen] = useState(true);

  const handleDismiss = () => {
    addDismissedId(announcement.id);
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            공지사항
          </DialogTitle>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {announcement.content}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDismiss}>
            이 공지 그만 보기
          </Button>
          <Button size="sm" className="flex-1" onClick={handleClose}>
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
