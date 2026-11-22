"use client";

import {
  X,
  Clock,
  CheckCircle2,
  BookOpen,
  Layers,
  CalendarClock,
  Play,
} from "lucide-react";
import type { SubjectRecord, TodoItem } from "./SubjectTodoPanel";
import type { SessionLogItem } from "./PomodoroTimer";
import type { NoteRecord, FlashcardRecord } from "./NotesFlashcardsPanel";
import type { ExamRecord } from "./DashboardBento";

interface SubjectHubDrawerProps {
  subject: SubjectRecord | null;
  sessions: SessionLogItem[];
  todos: TodoItem[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  exams: ExamRecord[];
  onClose: () => void;
  onFocusSubject: (title: string) => void;
}

export function SubjectHubDrawer({
  subject,
  sessions,
  todos,
  notes,
  flashcards,
  exams,
  onClose,
  onFocusSubject,
}: SubjectHubDrawerProps) {
  if (!subject) return null;

  const subSessions = sessions.filter(
    (s) => s.status === "completed" && s.subjectId === subject.id
  );
  const totalMins = subSessions.reduce((a, b) => a + b.actualMinutes, 0);
  const subTodos = todos.filter((t) => t.subjectId === subject.id);
  const openTodos = subTodos.filter((t) => !t.isCompleted && t.status !== "done");
  const doneTodos = subTodos.filter((t) => t.isCompleted || t.status === "done");
  const subNotes = notes.filter((n) => n.subjectId === subject.id);
  const subCards = flashcards.filter((c) => c.subjectId === subject.id);
  const subExams = exams.filter((e) =>
    e.title.toLowerCase().includes(subject.name.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="animate-tab-in flex h-full w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-4 w-4 shrink-0 rounded-full ring-4 ring-[var(--bg-elevated)]"
              style={{ backgroundColor: subject.color }}
            />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                {subject.name}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Tổng quan học tập theo môn (Subject Hub)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
                Tổng giờ học
              </div>
              <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
                {(totalMins / 60).toFixed(1)}h
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {subSessions.length} phiên hoàn thành
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Công việc
              </div>
              <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
                {doneTodos.length}/{subTodos.length}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                Còn {openTodos.length} việc chưa xong
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <BookOpen className="h-3.5 w-3.5 text-sky-500" />
                Ghi chú
              </div>
              <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
                {subNotes.length}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <Layers className="h-3.5 w-3.5 text-violet-500" />
                Flashcards
              </div>
              <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
                {subCards.length}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onFocusSubject(`Ôn tập ${subject.name}`);
              onClose();
            }}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium"
          >
            <Play className="h-3.5 w-3.5" />
            Bắt đầu phiên tập trung cho {subject.name}
          </button>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Việc cần làm đang mở ({openTodos.length})
            </h4>
            {openTodos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-3 text-xs text-[var(--text-muted)]">
                Tuyệt vời! Môn này hiện không còn việc tồn đọng.
              </p>
            ) : (
              <div className="space-y-1.5">
                {openTodos.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                  >
                    <span className="truncate text-[var(--text-primary)]">{t.title}</span>
                    {t.dueDate && (
                      <span className="ml-2 shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                        {t.dueDate.slice(0, 10)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {subNotes.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Ghi chú gần đây ({subNotes.length})
              </h4>
              <div className="space-y-1.5">
                {subNotes.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  >
                    {n.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {subExams.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                Kỳ thi liên quan
              </h4>
              <div className="space-y-1.5">
                {subExams.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{e.title}</span>
                    <span className="font-mono text-[11px] text-amber-600">
                      {e.examDate.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
