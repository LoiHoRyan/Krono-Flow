"use client";

import { useState, useEffect } from "react";
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
  Download,
  Maximize2,
  AlertTriangle,
  X,
  Volume2,
  Columns2,
  BookOpen,
  Upload,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "./MarkdownView";
import { PdfStudyReaderModal } from "./PdfStudyReaderModal";
import { playUiTick } from "@/lib/ui-sounds";
import type { SubjectOption } from "./PomodoroTimer";

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  subjectId: string | null;
  updatedAt: string;
}

export interface MistakeRecord {
  id: string;
  question: string;
  reason: string;
  solution: string;
  resolved: boolean;
  subjectId: string | null;
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
  mistakes = [],
  onUndoableDelete,
  onRefresh,
}: {
  subjects: SubjectOption[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  mistakes?: MistakeRecord[];
  onUndoableDelete?: (label: string, onUndo: () => Promise<void>) => void;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"notes" | "flashcards" | "quiz" | "typing" | "mistakes" | "feynman">("notes");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pastelMode, setPastelMode] = useState(false);
  const [noteColors, setNoteColors] = useState<Record<string, string>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [feynmanConcept, setFeynmanConcept] = useState("");
  const [feynmanBody, setFeynmanBody] = useState("");
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  const [feynmanRes, setFeynmanRes] = useState<{
    clarityScore: number;
    strengths: string[];
    gaps: string[];
    analogy: string;
  } | null>(null);
  const [readingNote, setReadingNote] = useState<NoteRecord | null>(null);
  const [mQuestion, setMQuestion] = useState("");
  const [mReason, setMReason] = useState("");
  const [mSolution, setMSolution] = useState("");
  const [mSubject, setMSubject] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [typeResult, setTypeResult] = useState<"idle" | "right" | "wrong">("idle");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPicked, setQuizPicked] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [cardSubject, setCardSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [splitPreview, setSplitPreview] = useState(false);
  const [speechLang, setSpeechLang] = useState<"vi-VN" | "en-US">("vi-VN");
  const [autoSpeak, setAutoSpeak] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("kronoflow-draft-note");
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.title && !noteTitle) setNoteTitle(d.title);
        if (d.content && !noteContent) setNoteContent(d.content);
      }
      const savedCols = localStorage.getItem("kronoflow-note-colors");
      if (savedCols) setNoteColors(JSON.parse(savedCols));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (noteTitle || noteContent) {
      localStorage.setItem("kronoflow-draft-note", JSON.stringify({ title: noteTitle, content: noteContent }));
    }
  }, [noteTitle, noteContent]);

  const cycleNotePastel = (id: string) => {
    const palette = ["", "#fef9c3", "#dcfce7", "#fce7f3", "#ede9fe"];
    const cur = noteColors[id] ?? "";
    const next = palette[(palette.indexOf(cur) + 1) % palette.length] ?? "";
    const updated = { ...noteColors, [id]: next };
    setNoteColors(updated);
    localStorage.setItem("kronoflow-note-colors", JSON.stringify(updated));
  };

  const handleBulkImportCards = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const pairs = lines
      .map((l) => {
        const parts = l.includes("\t") ? l.split("\t") : l.includes(";") ? l.split(";") : l.split(",");
        return { front: (parts[0] ?? "").trim(), back: parts.slice(1).join(" ").trim() };
      })
      .filter((p) => p.front && p.back);
    if (pairs.length === 0) return;
    setBulkImporting(true);
    try {
      await Promise.all(
        pairs.slice(0, 40).map((p) =>
          fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ front: p.front, back: p.back, subjectId: cardSubject || null }),
          })
        )
      );
      setBulkText("");
      setBulkOpen(false);
      onRefresh();
    } finally {
      setBulkImporting(false);
    }
  };

  const runFeynmanCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feynmanConcept.trim() || feynmanBody.trim().length < 10) return;
    setFeynmanLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const k = localStorage.getItem("kronoflow-gemini-key");
      if (k) headers["x-gemini-key"] = k;
      const res = await fetch("/api/ai/feynman", {
        method: "POST",
        headers,
        body: JSON.stringify({ concept: feynmanConcept.trim(), explanation: feynmanBody.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setFeynmanRes(json.data ?? null);
      }
    } finally {
      setFeynmanLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang;
    u.rate = 0.96;
    window.speechSynthesis.speak(u);
  };

  const insertMdSnippet = (snippet: string) => {
    setNoteContent((prev) => (prev ? `${prev}${snippet}` : snippet.trimStart()));
  };
  const [noteSubject, setNoteSubject] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
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
      localStorage.removeItem("kronoflow-draft-note");
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

  const exportNoteMd = (n: NoteRecord) => {
    const blob = new Blob([`# ${n.title}\n\n${n.content}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${n.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mQuestion.trim() || !mReason.trim() || !mSolution.trim()) return;
    const res = await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: mQuestion.trim(),
        reason: mReason.trim(),
        solution: mSolution.trim(),
        subjectId: mSubject || null,
      }),
    });
    if (res.ok) {
      setMQuestion("");
      setMReason("");
      setMSolution("");
      onRefresh();
    }
  };

  const toggleMistake = async (m: MistakeRecord) => {
    await fetch(`/api/mistakes/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !m.resolved }),
    });
    onRefresh();
  };

  const deleteMistake = async (id: string) => {
    await fetch(`/api/mistakes/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const deleteNote = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    onRefresh();
    if (target && onUndoableDelete) {
      onUndoableDelete(`Đã xóa ghi chú "${target.title}"`, async () => {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: target.title,
            content: target.content,
            subjectId: target.subjectId ?? undefined,
          }),
        });
        onRefresh();
      });
    }
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
    const target = flashcards.find((c) => c.id === id);
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
    setFlipped(false);
    onRefresh();
    if (target && onUndoableDelete) {
      onUndoableDelete("Đã xóa 1 thẻ Flashcard", async () => {
        await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: target.front,
            back: target.back,
            subjectId: target.subjectId ?? undefined,
          }),
        });
        onRefresh();
      });
    }
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
          <button
            type="button"
            onClick={() => {
              setSubTab("typing");
              setTypeInput("");
              setTypeResult("idle");
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "typing"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Tự gõ đáp án
          </button>
          <button
            type="button"
            onClick={() => setSubTab("mistakes")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "mistakes"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Sổ Lỗi Sai ({mistakes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("feynman")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "feynman"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Feynman AI
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPdfOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <BookOpen className="h-3.5 w-3.5" /> Đọc PDF song song
          </button>
          {subTab === "notes" && (
            <button
              type="button"
              onClick={() => setPastelMode((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
                pastelMode
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              )}
            >
              <StickyNote className="h-3.5 w-3.5" /> {pastelMode ? "Bảng ghim Pastel" : "Lưới chuẩn"}
            </button>
          )}
          {subTab === "flashcards" && (
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
            >
              <Upload className="h-3.5 w-3.5" /> Nhập hàng loạt CSV/Quizlet
            </button>
          )}
        </div>
        <PdfStudyReaderModal
          open={pdfOpen}
          subjects={subjects}
          onClose={() => setPdfOpen(false)}
          onSaved={onRefresh}
        />

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
            <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1.5 text-[11px]">
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => insertMdSnippet(" **in đậm** ")} className="rounded px-1.5 py-0.5 font-bold hover:bg-[var(--bg-elevated)]">B</button>
                <button type="button" onClick={() => insertMdSnippet(" *nghiêng* ")} className="rounded px-1.5 py-0.5 italic hover:bg-[var(--bg-elevated)]">I</button>
                <button type="button" onClick={() => insertMdSnippet(" `code` ")} className="rounded px-1.5 py-0.5 font-mono hover:bg-[var(--bg-elevated)]">&lt;/&gt;</button>
                <button type="button" onClick={() => insertMdSnippet("\n## Tiêu đề mục\n")} className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-elevated)]">H2</button>
                <button type="button" onClick={() => insertMdSnippet("\n- [ ] Việc cần làm")} className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-elevated)]">☑ List</button>
              </div>
              <button
                type="button"
                onClick={() => setSplitPreview((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium",
                  splitPreview ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                )}
              >
                <Columns2 className="h-3 w-3" />
                {splitPreview ? "Đang chia đôi" : "Chia đôi xem trước"}
              </button>
            </div>
            <div className={cn("grid gap-2.5", splitPreview ? "sm:grid-cols-2" : "grid-cols-1")}>
              <textarea
                rows={7}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Hỗ trợ Markdown: # Tiêu đề, **in đậm**, `code`, - [ ] checklist..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              {splitPreview && (
                <div className="max-h-[196px] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs">
                  {noteContent.trim() ? (
                    <MarkdownView content={noteContent} />
                  ) : (
                    <span className="text-[var(--text-muted)]">Xem trước Markdown trực tiếp...</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>
                {noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0} từ · ~
                {Math.max(1, Math.ceil((noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0) / 180))} phút đọc
              </span>
            </div>
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Lưu ghi chú
            </button>
          </form>

          <div className={cn("lg:col-span-7", pastelMode ? "columns-1 gap-4 space-y-4 sm:columns-2" : "grid gap-4 sm:grid-cols-2")}>
            {filteredNotes.map((n) => {
              const sub = n.subjectId ? subjectMap.get(n.subjectId) : undefined;
              const pCol = pastelMode ? noteColors[n.id] : "";
              return (
                <article
                  key={n.id}
                  style={pCol ? { backgroundColor: pCol, color: "#1e293b" } : undefined}
                  className="glass-card card-lift break-inside-avoid flex flex-col justify-between rounded-2xl p-4"
                >
                  {pastelMode && (
                    <button
                      type="button"
                      onClick={() => cycleNotePastel(n.id)}
                      className="mb-1.5 self-end rounded-md border border-black/10 bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                    >
                      Đổi màu giấy
                    </button>
                  )}
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
                            onClick={() => setReadingNote(n)}
                            title="Đọc khổ rộng"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => exportNoteMd(n)}
                            title="Tải xuống .md"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
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
      ) : subTab === "mistakes" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <form onSubmit={handleAddMistake} className="glass-card space-y-3 p-5 lg:col-span-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Ghi nhận Lỗi sai & Rút kinh nghiệm
            </h3>
            <select
              value={mSubject}
              onChange={(e) => setMSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">-- Môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              rows={2}
              value={mQuestion}
              onChange={(e) => setMQuestion(e.target.value)}
              placeholder="Câu hỏi / Bài tập làm sai..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={2}
              value={mReason}
              onChange={(e) => setMReason(e.target.value)}
              placeholder="Nguyên nhân sai (VD: Quên điều kiện biên, nhầm dấu)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={2}
              value={mSolution}
              onChange={(e) => setMSolution(e.target.value)}
              placeholder="Cách giải đúng & Lưu ý cần nhớ..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button type="submit" className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" />
              Lưu vào Sổ Lỗi Sai
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            {mistakes.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-[var(--text-muted)]">
                Chưa có ghi nhận lỗi sai nào. Lưu lại những lỗi hay gặp để tránh lặp lại khi đi thi!
              </div>
            ) : (
              mistakes.map((m) => {
                const sub = m.subjectId ? subjectMap.get(m.subjectId) : undefined;
                return (
                  <div key={m.id} className="glass-card card-lift space-y-2 p-4 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {sub && (
                          <span className="mr-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                            {sub.name}
                          </span>
                        )}
                        {m.question}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleMistake(m)}
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] font-medium",
                            m.resolved
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {m.resolved ? "✓ Đã khắc phục" : "Cần ôn lại"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMistake(m.id)}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-rose-600 dark:text-rose-400">
                      <strong>Lỗi:</strong> {m.reason}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400">
                      <strong>Cách sửa:</strong> {m.solution}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : subTab === "typing" ? (
        <div className="glass-card mx-auto max-w-xl p-6">
          {flashcards.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              Chưa có thẻ Flashcard nào để luyện gõ.
            </p>
          ) : (() => {
            const tCard = flashcards[quizIdx % flashcards.length]!;
            return (
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  Thẻ {(quizIdx % flashcards.length) + 1} / {flashcards.length} · Luyện nhớ chủ động (Typing Recall)
                </div>
                <h4 className="mt-3 text-lg font-medium text-[var(--text-primary)]">
                  {tCard.front}
                </h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const ok =
                      typeInput.trim().toLowerCase() === tCard.back.trim().toLowerCase();
                    setTypeResult(ok ? "right" : "wrong");
                  }}
                  className="mt-4 space-y-3"
                >
                  <input
                    type="text"
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    placeholder="Nhập chính xác đáp án..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-xs font-medium">
                      Kiểm tra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuizIdx((i) => i + 1);
                        setTypeInput("");
                        setTypeResult("idle");
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs text-[var(--text-secondary)]"
                    >
                      Thẻ tiếp theo →
                    </button>
                  </div>
                </form>
                {typeResult !== "idle" && (
                  <div
                    className={cn(
                      "mt-4 rounded-xl p-3 text-xs font-medium",
                      typeResult === "right"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {typeResult === "right"
                      ? "Chính xác tuyệt đối!"
                      : `Chưa khớp — Đáp án đúng là: "${tCard.back}"`}
                  </div>
                )}
              </div>
            );
          })()}
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
      ) : subTab === "feynman" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <form onSubmit={runFeynmanCheck} className="glass-card space-y-3 rounded-2xl p-6 lg:col-span-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              Ôn bài bằng Kỹ thuật Feynman cùng AI
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Hãy tự giải thích khái niệm bằng ngôn từ đơn giản như đang giảng lại cho người mới — AI sẽ chấm độ rõ ràng và chỉ ra lỗ hổng.
            </p>
            <input
              type="text"
              value={feynmanConcept}
              onChange={(e) => setFeynmanConcept(e.target.value)}
              placeholder="Tên khái niệm (VD: Quy luật giá trị, Đệ quy, Lạm phát...)"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={7}
              value={feynmanBody}
              onChange={(e) => setFeynmanBody(e.target.value)}
              placeholder="Viết lại lời giải thích theo cách hiểu của riêng bạn..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={feynmanLoading || !feynmanConcept.trim() || feynmanBody.trim().length < 10}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {feynmanLoading ? "AI đang chấm độ rõ ràng..." : "Chấm điểm Feynman"}
            </button>
          </form>
          <div className="glass-card rounded-2xl p-6 lg:col-span-6">
            {feynmanRes ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">Điểm dễ hiểu Feynman</span>
                  <span className="font-mono text-2xl font-bold text-[var(--accent)]">
                    {feynmanRes.clarityScore}/100
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">Điểm làm tốt</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                    {feynmanRes.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-amber-600 dark:text-amber-400">Lỗ hổng cần bổ sung</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                    {feynmanRes.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
                {feynmanRes.analogy && (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-[var(--text-secondary)]">
                    <strong>Ví dụ gợi nhớ:</strong> {feynmanRes.analogy}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-[var(--text-muted)]">
                Nhập khái niệm và lời giải thích bên trái để nhận phản hồi chi tiết từ AI.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bulkOpen && (
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Nhập nhanh nhiều Flashcards (mỗi dòng 1 thẻ, ngăn cách bởi dấu chấm phẩy <code>;</code> hoặc Tab từ Quizlet/Excel)
              </div>
              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Resilient ; Kiên cường, mau phục hồi\nOpportunity cost ; Chi phí cơ hội"}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 font-mono text-xs text-[var(--text-primary)]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={bulkImporting || !bulkText.trim()}
                  onClick={handleBulkImportCards}
                  className="btn-primary rounded-xl px-4 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {bulkImporting ? "Đang nhập..." : "Tạo hàng loạt thẻ"}
                </button>
              </div>
            </div>
          )}
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

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => speakText(flipped ? activeCard.back : activeCard.front)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 font-medium text-[var(--accent)]"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Đọc {flipped ? "đáp án" : "câu hỏi"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechLang((l) => (l === "vi-VN" ? "en-US" : "vi-VN"))}
                      className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)]"
                    >
                      {speechLang === "vi-VN" ? "Giọng VI" : "Voice EN"}
                    </button>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                    />
                    Tự đọc khi lật
                  </label>
                </div>

                {/* 3D FLIP CARD */}
                <div
                  onClick={() => {
                    const nextFlipped = !flipped;
                    setFlipped(nextFlipped);
                    playUiTick("flip");
                    if (autoSpeak) {
                      speakText(nextFlipped ? activeCard.back : activeCard.front);
                    }
                  }}
                  className="perspective-1000 mt-3 h-[220px] w-full cursor-pointer"
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
        </div>
      )}
      {readingNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setReadingNote(null)}
        >
          <div
            className="animate-pop max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-xl font-medium text-[var(--text-primary)]">
                {readingNote.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportNoteMd(readingNote)}
                  className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                >
                  Tải .md
                </button>
                <button type="button" onClick={() => setReadingNote(null)}>
                  <X className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <MarkdownView content={readingNote.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
