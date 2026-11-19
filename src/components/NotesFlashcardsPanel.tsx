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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [subTab, setSubTab] = useState<"notes" | "flashcards">("notes");
  const [search, setSearch] = useState("");

  // Note form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubject, setNoteSubject] = useState("");

  // Flashcard form & study state
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

  const deleteNote = async (id: string) => {
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

  const updateMastery = async (card: FlashcardRecord, delta: number) => {
    const next = Math.max(0, Math.min(5, card.mastery + delta));
    await fetch(`/api/flashcards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery: next }),
    });
    setFlipped(false);
    if (flashcards.length > 1) {
      setCardIdx((i) => (i + 1) % flashcards.length);
    }
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

  const activeCard = flashcards[cardIdx % Math.max(1, flashcards.length)];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          <button
            type="button"
            onClick={() => setSubTab("notes")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition",
              subTab === "notes"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Ghi chú học tập ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("flashcards")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition",
              subTab === "flashcards"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Thẻ Flashcards ({flashcards.length})
          </button>
        </div>

        {subTab === "notes" && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm ghi chú..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
      </div>

      {subTab === "notes" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateNote}
            className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tạo ghi chú mới</h3>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Tiêu đề (VD: Tóm tắt thuật toán Dijkstra)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={noteSubject}
              onChange={(e) => setNoteSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-secondary)] outline-none"
            >
              <option value="">-- Gắn môn học (tùy chọn) --</option>
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
              placeholder="Nội dung kiến thức, công thức, ý chính..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Lưu ghi chú vào PostgreSQL
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] p-10 text-center text-xs text-[var(--text-muted)]">
                Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên ở cột bên trái.
              </div>
            ) : (
              filteredNotes.map((n) => {
                const sub = n.subjectId ? subjectMap.get(n.subjectId) : undefined;
                return (
                  <article
                    key={n.id}
                    className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--accent)]/50"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-[var(--text-primary)]">{n.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => togglePin(n)}
                            className={cn(
                              "rounded-lg p-1 transition",
                              n.pinned
                                ? "bg-amber-500/15 text-amber-500"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            )}
                            title="Ghim ghi chú"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNote(n.id)}
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-rose-500"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-secondary)]">
                        {n.content}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--text-muted)]">
                      <span>{sub ? sub.name : "Chung"}</span>
                      <span>
                        {new Date(n.updatedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {activeCard ? (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    Thẻ {(cardIdx % flashcards.length) + 1} / {flashcards.length}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <span
                        key={lv}
                        className={cn(
                          "h-1.5 w-4 rounded-full",
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

                <button
                  type="button"
                  onClick={() => setFlipped((f) => !f)}
                  className="mt-4 flex min-h-[210px] w-full flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-6 text-center transition hover:border-[var(--accent)]"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                    {flipped ? "Đáp án / Giải thích" : "Câu hỏi / Khái niệm"}
                  </span>
                  <p className="mt-3 text-lg font-medium text-[var(--text-primary)]">
                    {flipped ? activeCard.back : activeCard.front}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <RotateCw className="h-3 w-3" />
                    Bấm vào thẻ để lật
                  </span>
                </button>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setCardIdx((i) => (i - 1 + flashcards.length) % flashcards.length);
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setCardIdx((i) => (i + 1) % flashcards.length);
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateMastery(activeCard, -1)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/20"
                    >
                      Cần ôn lại
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMastery(activeCard, 1)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Đã thuộc (+1)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center text-xs text-[var(--text-muted)]">
                Chưa có thẻ Flashcard nào. Tạo thẻ ở cột bên phải để bắt đầu ôn tập Active Recall.
              </div>
            )}
          </div>

          <form
            onSubmit={handleCreateCard}
            className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Thêm thẻ Flashcard</h3>
            <select
              value={cardSubject}
              onChange={(e) => setCardSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-secondary)] outline-none"
            >
              <option value="">-- Môn học (tùy chọn) --</option>
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
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={3}
              value={cardBack}
              onChange={(e) => setCardBack(e.target.value)}
              placeholder="Mặt sau (Đáp án / Giải thích)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
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
