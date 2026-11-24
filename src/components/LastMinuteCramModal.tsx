"use client";

import { useEffect, useState } from "react";
import { Flame, Printer, X, Pin, AlertTriangle, Code2 } from "lucide-react";
import type { NoteRecord, MistakeRecord } from "./NotesFlashcardsPanel";
import { formatDuration } from "@/lib/utils";

export function LastMinuteCramModal({
  open,
  notes,
  mistakes,
  onClose,
}: {
  open: boolean;
  notes: NoteRecord[];
  mistakes: MistakeRecord[];
  onClose: () => void;
}) {
  const [secsLeft, setSecsLeft] = useState(15 * 60);
  const [snippets, setSnippets] = useState<{ id: string; title: string; body: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setSecsLeft(15 * 60);
    try {
      const raw = localStorage.getItem("kronoflow-cheatsheets");
      if (raw) setSnippets(JSON.parse(raw));
    } catch {
      // ignore
    }
    const id = setInterval(() => setSecsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const pinnedNotes = notes.filter((n) => n.pinned);
  const activeMistakes = mistakes.filter((m) => !m.resolved).slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Chế độ Ôn gấp trước giờ thi (Last-Minute Cram 15p)
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Gom gọn Ghi chú đã ghim · Sổ Lỗi Sai · Công thức trọng tâm trên 1 trang
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-amber-500/15 px-3 py-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
              ⏱ {formatDuration(secsLeft)}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              <Printer className="h-3.5 w-3.5" /> In nhanh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1 text-xs">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
              <Pin className="h-3.5 w-3.5" /> Ghi chú đã ghim ({pinnedNotes.length})
            </h4>
            {pinnedNotes.length === 0 ? (
              <p className="text-[var(--text-muted)]">Chưa có ghi chú nào được ghim.</p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {pinnedNotes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{n.title}</div>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11px] text-[var(--text-secondary)]">
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-rose-500">
              <AlertTriangle className="h-3.5 w-3.5" /> Lỗi sai cần tránh ({activeMistakes.length})
            </h4>
            {activeMistakes.length === 0 ? (
              <p className="text-[var(--text-muted)]">Tuyệt vời! Bạn không còn lỗi sai tồn đọng.</p>
            ) : (
              <div className="space-y-2">
                {activeMistakes.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{m.question}</div>
                    <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <strong>Chuẩn:</strong> {m.solution}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {snippets.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                <Code2 className="h-3.5 w-3.5" /> Công thức & Ghi nhớ nhanh ({snippets.length})
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {snippets.slice(0, 6).map((sn) => (
                  <div
                    key={sn.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{sn.title}</div>
                    <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-[var(--text-secondary)]">
                      {sn.body}
                    </pre>
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
