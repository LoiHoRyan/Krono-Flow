"use client";

import { getLocalDateIso } from "@/lib/utils";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Sparkles, X } from "lucide-react";
import type { ExamRecord } from "./DashboardBento";

export function ReverseExamPlannerModal({
  open,
  exams,
  onClose,
  onRefresh,
}: {
  open: boolean;
  exams: ExamRecord[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [selectedExamId, setSelectedExamId] = useState("");
  const [chaptersRaw, setChaptersRaw] = useState(
    "Chương 1: Khái niệm nền tảng\nChương 2: Lý thuyết trọng tâm\nChương 3: Bài tập vận dụng\nChương 4: Tổng ôn & Làm đề thi thử"
  );
  const [saving, setSaving] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const chosenExam = useMemo(() => {
    const found = exams.find((e) => e.id === selectedExamId);
    return found ?? exams[0] ?? null;
  }, [exams, selectedExamId]);

  const plannedTasks = useMemo(() => {
    if (!chosenExam) return [];
    const lines = chaptersRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const today = new Date();
    const examDt = new Date(chosenExam.examDate);
    const totalDays = Math.max(1, Math.floor((examDt.getTime() - today.getTime()) / 86400000));
    return lines.map((line, idx) => {
      const offset = Math.min(
        Math.max(0, totalDays - 1),
        Math.floor((idx * totalDays) / lines.length)
      );
      const due = getLocalDateIso(new Date(today.getTime() + offset * 86400000));
      return {
        title: `[Ôn thi ${chosenExam.title}] ${line}`,
        dueDate: due,
      };
    });
  }, [chosenExam, chaptersRaw]);

  if (!open) return null;

  const handleApply = async () => {
    if (plannedTasks.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        plannedTasks.slice(0, 20).map((t) =>
          fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: t.title,
              priority: "high",
              dueDate: t.dueDate,
            }),
          })
        )
      );
      setDoneMsg(`Đã đẩy ${Math.min(20, plannedTasks.length)} lịch ôn thi vào Công việc!`);
      onRefresh();
      setTimeout(() => {
        setDoneMsg(null);
        onClose();
      }, 1400);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Lập lịch ôn thi ngược tự động (Reverse Exam Planner)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {exams.length === 0 ? (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Hãy thêm ít nhất 1 kỳ thi ở mục Đếm ngược Kỳ thi trước để chia lịch ôn ngược tự động.
          </p>
        ) : (
          <div className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="font-medium text-[var(--text-secondary)]">Chọn kỳ thi mục tiêu</label>
              <select
                value={chosenExam?.id ?? ""}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.examDate.slice(0, 10)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-[var(--text-secondary)]">
                Các chương / nội dung cần ôn (mỗi dòng 1 mục)
              </label>
              <textarea
                rows={4}
                value={chaptersRaw}
                onChange={(e) => setChaptersRaw(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="mb-2 font-semibold text-[var(--text-primary)]">
                Lịch ôn dự kiến ({plannedTasks.length} mốc)
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {plannedTasks.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-[var(--text-secondary)]">{t.title}</span>
                    <span className="shrink-0 font-mono text-[var(--accent)]">{t.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>

            {doneMsg && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {doneMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--border-subtle)] px-3.5 py-2 text-xs text-[var(--text-secondary)]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || plannedTasks.length === 0}
                onClick={handleApply}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {saving ? "Đang tạo lịch..." : "Đẩy toàn bộ vào Công việc"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
