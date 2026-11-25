"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import type { FlashcardRecord, NoteRecord } from "./NotesFlashcardsPanel";
import type { ExamRecord } from "./DashboardBento";

interface FormulaItem {
  id: string;
  subjectName: string;
  title: string;
  body: string;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

export function GlobalSpotlightModal({
  open,
  onClose,
  subjects,
  todos,
  notes,
  flashcards,
  exams,
  onJumpTab,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  todos: TodoItem[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  exams: ExamRecord[];
  onJumpTab: (tab: "dashboard" | "planner" | "knowledge" | "schedule") => void;
}) {
  const [query, setQuery] = useState("");
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    try {
      const raw = localStorage.getItem("kronoflow-formulas-v1");
      if (raw) setFormulas(JSON.parse(raw) as FormulaItem[]);
    } catch {
      // ignore
    }
  }, [open]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    const items: {
      id: string;
      group: string;
      title: string;
      sub: string;
      tab: "dashboard" | "planner" | "knowledge" | "schedule";
    }[] = [];

    for (const s of subjects) {
      if (norm(s.name).includes(q)) {
        items.push({ id: `sub-${s.id}`, group: "Môn học", title: s.name, sub: "Tab Môn học & Todo", tab: "planner" });
      }
    }
    for (const ex of exams) {
      if (norm(ex.title).includes(q)) {
        items.push({
          id: `ex-${ex.id}`,
          group: "Kỳ thi",
          title: ex.title,
          sub: `Ngày thi: ${ex.examDate.slice(0, 10)}`,
          tab: "dashboard",
        });
      }
    }
    for (const t of todos) {
      if (norm(t.title).includes(q)) {
        items.push({
          id: `td-${t.id}`,
          group: "Công việc",
          title: t.title,
          sub: t.isCompleted ? "Đã hoàn thành" : `Ưu tiên: ${t.priority}`,
          tab: "planner",
        });
      }
    }
    for (const n of notes) {
      if (norm(n.title).includes(q) || norm(n.content).includes(q)) {
        items.push({
          id: `nt-${n.id}`,
          group: "Ghi chú",
          title: n.title,
          sub: n.content.slice(0, 70),
          tab: "knowledge",
        });
      }
    }
    for (const fc of flashcards) {
      if (norm(fc.front).includes(q) || norm(fc.back).includes(q)) {
        items.push({
          id: `fc-${fc.id}`,
          group: "Flashcard",
          title: fc.front,
          sub: fc.back.slice(0, 70),
          tab: "knowledge",
        });
      }
    }
    for (const fm of formulas) {
      if (norm(fm.title).includes(q) || norm(fm.body).includes(q) || norm(fm.subjectName).includes(q)) {
        items.push({
          id: `fm-${fm.id}`,
          group: "Công thức",
          title: `${fm.title} (${fm.subjectName})`,
          sub: fm.body.slice(0, 70),
          tab: "dashboard",
        });
      }
    }
    return items.slice(0, 20);
  }, [query, subjects, todos, notes, flashcards, exams, formulas]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[70] flex items-start justify-center bg-black/55 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--accent)]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm xuyên suốt Ghi chú, Flashcards, Công thức, Todo, Môn học, Kỳ thi..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <p className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
              Gõ từ khóa (không cần dấu) để tìm tức thì trên toàn bộ dữ liệu KronoFlow. Phím tắt mở nhanh: <strong>Alt+K</strong>.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
              Không tìm thấy mục nào khớp với &quot;{query}&quot;.
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onJumpTab(r.tab);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {r.group}
                      </span>
                      <span className="truncate font-medium text-[var(--text-primary)]">{r.title}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{r.sub}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
