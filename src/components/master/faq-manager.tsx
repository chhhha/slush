"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpCircle, Plus, Pencil, Trash2, GripVertical, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Faq } from "@/types";

export function FaqManager() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // 수정 상태
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 삭제 상태
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch("/api/master/faqs");
      const data = await res.json();
      if (data.success) {
        setFaqs(data.data);
      }
    } catch {
      toast.error("FAQ 목록을 불러오지 못했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFaqs();
  }, [fetchFaqs]);

  // FAQ 추가
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/master/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion.trim(), answer: newAnswer.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFaqs((prev) => [...prev, data.data]);
        setNewQuestion("");
        setNewAnswer("");
        setShowAddForm(false);
        toast.success("FAQ가 추가되었습니다");
      } else {
        toast.error(data.error ?? "추가에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsAdding(false);
    }
  };

  // FAQ 수정
  const startEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  };

  const handleSave = async () => {
    if (editingId === null || !editQuestion.trim() || !editAnswer.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/master/faqs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: editQuestion.trim(), answer: editAnswer.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFaqs((prev) => prev.map((f) => (f.id === editingId ? data.data : f)));
        setEditingId(null);
        toast.success("FAQ가 수정되었습니다");
      } else {
        toast.error(data.error ?? "수정에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // FAQ 삭제
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/master/faqs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        toast.success("FAQ가 삭제되었습니다");
      } else {
        toast.error(data.error ?? "삭제에 실패했습니다");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">자주 묻는 질문 (FAQ)</p>
            <p className="text-xs text-muted-foreground">
              직원 페이지에 표시되는 FAQ를 관리합니다
            </p>
          </div>
        </div>
        {!showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="size-4 mr-1" />
            추가
          </Button>
        )}
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-q" className="text-xs">질문</Label>
            <Input
              id="new-q"
              placeholder="자주 묻는 질문을 입력하세요"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              maxLength={200}
              disabled={isAdding}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-a" className="text-xs">답변</Label>
            <Textarea
              id="new-a"
              placeholder="답변을 입력하세요"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              maxLength={1000}
              rows={3}
              disabled={isAdding}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowAddForm(false); setNewQuestion(""); setNewAnswer(""); }}
              disabled={isAdding}
            >
              취소
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isAdding || !newQuestion.trim() || !newAnswer.trim()}
            >
              {isAdding ? "추가 중..." : "추가"}
            </Button>
          </div>
        </form>
      )}

      {/* FAQ 목록 */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">불러오는 중...</p>
      ) : faqs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          등록된 FAQ가 없습니다. 위의 추가 버튼으로 FAQ를 등록해주세요.
        </p>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className={cn(
                "rounded-lg border p-3 space-y-2 transition-colors",
                editingId === faq.id && "border-primary/50 bg-primary/5",
              )}
            >
              {editingId === faq.id ? (
                // 수정 모드
                <div className="space-y-2">
                  <Input
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    maxLength={200}
                    disabled={isSaving}
                    className="text-sm"
                  />
                  <Textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    disabled={isSaving}
                    className="text-sm"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      disabled={isSaving}
                    >
                      <X className="size-3.5 mr-1" />
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !editQuestion.trim() || !editAnswer.trim()}
                    >
                      <Check className="size-3.5 mr-1" />
                      {isSaving ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </div>
              ) : (
                // 보기 모드
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-primary mt-0.5 shrink-0">
                        Q{index + 1}.
                      </span>
                      <p className="min-w-0 text-sm font-medium leading-snug break-words">{faq.question}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={() => startEdit(faq)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <button
                              type="button"
                              className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              disabled={deletingId === faq.id}
                            />
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>FAQ를 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &ldquo;{faq.question.length > 30 ? faq.question.slice(0, 30) + "..." : faq.question}&rdquo; 항목이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(faq.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="whitespace-pre-line break-words text-xs text-muted-foreground leading-relaxed pl-6">
                    {faq.answer}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
