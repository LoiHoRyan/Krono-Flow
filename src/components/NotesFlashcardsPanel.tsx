"use client";

import { useState } from "react";
import {
  FileText,
  Layers,
  Pin,
  Plus,
  RotateCw,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "./MarkdownView";
import type { SubjectOption } from "./PomodoroTimer";

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  subjectId: string | null;
  updatedAt: string;
}

export interface FlashcardRecord {
  id: string;
  front: string;
  back: string;
  mastery: number;
  nextReviewAt?: string;
  subjectId: string | null;
}

export function NotesFlashcardsPanel({
  subjects,
  notes,
  flashcards,
  onRefresh,
}: {
  subjects: SubjectOption[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"notes" | "flashcards" | "quiz">("notes");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPicked, setQuizPicked] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardSubject, setCardSubject] = useState("");
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        subjectId: noteSubject || null,
      }),
    });
    if (res.ok) {
      setNoteTitle("");
      setNoteContent("");
      onRefresh();
    }
  };

  const togglePin = async (n: NoteRecord) => {
    await fetch(`/api/notes/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !n.pinned }),
    });
    onRefresh();
  };

  const saveNoteEdit = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
    });
    setEditingNoteId(null);
    onRefresh();
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa ghi chú này?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: cardFront.trim(),
        back: cardBack.trim(),
        subjectId: cardSubject || null,
      }),
    });
    if (res.ok) {
      setCardFront("");
      setCardBack("");
      onRefresh();
    }
  };

  const nowMs = Date.now();
  const dueCards = flashcards.filter(
    (c) => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= nowMs
  );
  const deck = onlyDue ? dueCards : flashcards;

  const updateMastery = async (card: FlashcardRecord, delta: number) => {
    const next = Math.max(0, Math.min(5, card.mastery + delta));
    await fetch(`/api/flashcards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery: next }),
    });
    setFlipped(false);
    if (deck.length > 1) setCardIdx((i) => (i + 1) % deck.length);
    onRefresh();
  };

  const deleteCard = async (id: string) => {
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
    setCardIdx(0);
    setFlipped(false);
    onRefresh();
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const activeCard = deck[cardIdx % Math.max(1, deck.length)];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          <button
            type="button"
            onClick={() => setSubTab("notes")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "notes"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Ghi chú ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("flashcards")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "flashcards"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Flashcards 3D ({flashcards.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab("quiz");
              setQuizIdx(0);
              setQuizScore(0);
              setQuizPicked(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "quiz"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Trắc nghiệm Quiz
          </button>
        </div>

        {subTab === "notes" ? (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm ghi chú..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOnlyDue((v) => !v);
              setCardIdx(0);
              setFlipped(false);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium",
              onlyDue
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Cần ôn hôm nay ({dueCards.length} thẻ)
          </button>
        )}
      </div>

      {subTab === "notes" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateNote}
            className="glass-card space-y-3 rounded-2xl p-5 lg:col-span-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tạo ghi chú mới</h3>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Tiêu đề..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={noteSubject}
              onChange={(e) => setNoteSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">-- Gắn môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              rows={6}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Hỗ trợ Markdown: # Tiêu đề, **in đậm**, `code`, - [ ] checklist..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Lưu ghi chú
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {filteredNotes.map((n) => {
              const sub = n.subjectId ? subjectMap.get(n.subjectId) : undefined;
              return (
                <article
                  key={n.id}
                  className="glass-card card-lift flex flex-col justify-between rounded-2xl p-4"
                >
                  {editingNoteId === n.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                      />
                      <textarea
                        rows={4}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveNoteEdit(n.id)}
                          className="btn-primary rounded-lg px-3 py-1 text-[11px] font-medium"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg border border-[var(--border-subtle)] px-3 py-1 text-[11px] text-[var(--text-muted)]"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-[var(--text-primary)]">{n.title}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(n.id);
                              setEditTitle(n.title);
                              setEditContent(n.content);
                            }}
                            title="Sửa ghi chú"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePin(n)}
                            className={cn(
                              "rounded-lg p-1",
                              n.pinned ? "bg-amber-500/15 text-amber-500" : "text-[var(--text-muted)]"
                            )}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNote(n.id)}
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <MarkdownView content={n.content} />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--text-muted)]">
                    <span>{sub ? sub.name : "Chung"}</span>
                    <span>{new Date(n.updatedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : subTab === "quiz" ? (
        <div className="glass-card mx-auto max-w-2xl rounded-2xl p-6">
          {flashcards.length < 2 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              Cần tạo ít nhất 2 thẻ Flashcard để hệ thống tự sinh đề trắc nghiệm.
            </p>
          ) : (() => {
            const qCard = flashcards[quizIdx % flashcards.length]!;
            const distractors = flashcards
              .filter((c) => c.id !== qCard.id)
              .slice(0, 3)
              .map((c) => c.back);
            const options = [qCard.back, ...distractors].sort((a, b) => a.localeCompare(b));
            return (
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Câu {(quizIdx % flashcards.length) + 1} / {flashcards.length}</span>
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    Điểm: {quizScore}
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  {qCard.front}
                </h4>
                <div className="mt-5 grid gap-2.5">
                  {options.map((opt, idx) => {
                    const isCorrect = opt === qCard.back;
                    const picked = quizPicked === opt;
                    return (
                      <button
                        key={opt + idx}
                        type="button"
                        disabled={quizPicked !== null}
                        onClick={() => {
                          setQuizPicked(opt);
                          if (isCorrect) setQuizScore((s) => s + 1);
                        }}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left text-xs font-medium",
                          quizPicked === null
                            ? "border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--accent)]"
                            : isCorrect
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : picked
                            ? "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] opacity-60"
                        )}
                      >
                        <span className="mr-2 font-mono font-bold">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizPicked !== null && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setQuizPicked(null);
                        setQuizIdx((i) => i + 1);
                      }}
                      className="btn-primary rounded-xl px-4 py-2 text-xs font-medium"
                    >
                      Câu tiếp theo →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {activeCard ? (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    Thẻ {(cardIdx % deck.length) + 1} / {deck.length}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <span
                        key={lv}
                        className={cn(
                          "h-1.5 w-4 rounded-full transition-colors",
                          lv <= activeCard.mastery ? "bg-emerald-500" : "bg-[var(--bg-elevated)]"
                        )}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => deleteCard(activeCard.id)}
                      className="ml-2 text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3D FLIP CARD */}
                <div
                  onClick={() => setFlipped((f) => !f)}
                  className="perspective-1000 mt-4 h-[220px] w-full cursor-pointer"
                >
                  <div
                    className={cn(
                      "flip-inner relative h-full w-full",
                      flipped && "is-flipped"
                    )}
                  >
                    <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-6 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                        Câu hỏi / Khái niệm
                      </span>
                      <p className="mt-3 text-lg font-medium text-[var(--text-primary)]">
                        {activeCard.front}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <RotateCw className="h-3 w-3" />
                        Chạm để lật 3D
                      </span>
                    </div>

                    <div className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-6 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                        Đáp án / Giải thích
                      </span>
                      <p className="mt-3 text-base font-medium text-[var(--text-primary)]">
                        {activeCard.back}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setCardIdx((i) => (i - 1 + deck.length) % deck.length);
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setCardIdx((i) => (i + 1) % deck.length);
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateMastery(activeCard, -1)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
                    >
                      Ôn lại hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMastery(activeCard, 1)}
                      className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Đã thuộc (SM-2)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card flex min-h-[260px] items-center justify-center rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                {onlyDue
                  ? "Bạn đã ôn xong toàn bộ thẻ đến hạn hôm nay!"
                  : "Chưa có thẻ Flashcard nào. Tạo thẻ mới ở cột bên phải nhé."}
              </div>
            )}
          </div>

          <form
            onSubmit={handleCreateCard}
            className="glass-card space-y-3 rounded-2xl p-5 lg:col-span-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Thêm thẻ Flashcard</h3>
            <select
              value={cardSubject}
              onChange={(e) => setCardSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">-- Môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              value={cardFront}
              onChange={(e) => setCardFront(e.target.value)}
              placeholder="Mặt trước (Câu hỏi / Thuật ngữ)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={3}
              value={cardBack}
              onChange={(e) => setCardBack(e.target.value)}
              placeholder="Mặt sau (Đáp án / Giải thích)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo thẻ ôn tập
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
