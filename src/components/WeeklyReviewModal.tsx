"use client";

import { useMemo, useState } from "react";
import {
  X,
  TrendingUp,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import type { SessionLogItem } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import { cn } from "@/lib/utils";

interface WeeklyReviewModalProps {
  open: boolean;
  onClose: () => void;
  sessions: SessionLogItem[];
  todos: TodoItem[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

export function WeeklyReviewModal({
  open,
  onClose,
  sessions,
  todos,
  onRefresh,
  onNotify,
}: WeeklyReviewModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [energy, setEnergy] = useState(4);
  const [wins, setWins] = useState("");
  const [nextFocus, setNextFocus] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const msDay = 86400000;
    const completed = sessions.filter((s) => s.status === "completed");
    let thisWeekMins = 0;
    let lastWeekMins = 0;
    const dailyBuckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * msDay);
      const iso = d.toISOString().slice(0, 10);
      return { iso, label: `T${d.getDay() === 0 ? "CN" : d.getDay() + 1}`.replace("TCN", "CN"), mins: 0 };
    });

    for (const s of completed) {
      const diffDays = Math.floor((now.getTime() - new Date(s.startedAt).getTime()) / msDay);
      if (diffDays >= 0 && diffDays < 7) {
        thisWeekMins += s.actualMinutes;
        const b = dailyBuckets.find((x) => x.iso === s.startedAt.slice(0, 10));
        if (b) b.mins += s.actualMinutes;
      } else if (diffDays >= 7 && diffDays < 14) {
        lastWeekMins += s.actualMinutes;
      }
    }

    const doneTodos = todos.filter((t) => t.isCompleted || t.status === "done").length;
    const openTodos = todos.filter((t) => !t.isCompleted && t.status !== "done");
    const deltaPct =
      lastWeekMins > 0
        ? Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100)
        : thisWeekMins > 0
        ? 100
        : 0;

    return { thisWeekMins, lastWeekMins, deltaPct, dailyBuckets, doneTodos, openTodos };
  }, [sessions, todos]);

  if (!open) return null;

  const maxDayMins = Math.max(30, ...stats.dailyBuckets.map((b) => b.mins));

  const saveReflection = async () => {
    setSaving(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const summary = `[Tổng kết tuần · Năng lượng ${energy}/5] Thành tựu: ${wins || "Duy trì nhịp học"} | Ưu tiên tuần tới: ${nextFocus || "Tiếp tục mục tiêu chính"}`;
      await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: todayIso,
          mood: energy,
          highlight: summary,
          improvement: nextFocus || "Giữ vững kỷ luật Pomodoro",
        }),
      });
      onNotify("Đã lưu bản tự đánh giá cuối tuần!");
      onRefresh();
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const rolloverUnfinished = async () => {
    setSaving(true);
    try {
      const nextMonday = new Date();
      nextMonday.setDate(nextMonday.getDate() + 1);
      const targetIso = nextMonday.toISOString().slice(0, 10);
      await Promise.all(
        stats.openTodos.slice(0, 15).map((t) =>
          fetch(`/api/todos/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dueDate: targetIso }),
          })
        )
      );
      onNotify(`Đã dời ${Math.min(15, stats.openTodos.length)} việc sang tuần mới!`);
      onRefresh();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Tổng kết tuần (Bước {step}/3)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Nhìn lại 7 ngày qua và khởi động tuần mới gọn gàng
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                step >= n ? "bg-[var(--accent)]" : "bg-[var(--bg-elevated)]"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[11px] text-[var(--text-muted)]">Tuần này</div>
                <div className="mt-1 font-mono text-lg font-semibold text-[var(--accent)]">
                  {(stats.thisWeekMins / 60).toFixed(1)}h
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[11px] text-[var(--text-muted)]">So tuần trước</div>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1 font-mono text-lg font-semibold",
                    stats.deltaPct >= 0 ? "text-emerald-600" : "text-rose-500"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  {stats.deltaPct >= 0 ? `+${stats.deltaPct}%` : `${stats.deltaPct}%`}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[11px] text-[var(--text-muted)]">Việc hoàn thành</div>
                <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
                  {stats.doneTodos}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
              <div className="mb-3 text-xs font-medium text-[var(--text-secondary)]">
                Nhịp tập trung 7 ngày qua (phút)
              </div>
              <div className="flex h-24 items-end gap-2">
                {stats.dailyBuckets.map((b) => (
                  <div key={b.iso} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md bg-[var(--accent)]/85 transition-all"
                        style={{ height: `${Math.max(8, Math.round((b.mins / maxDayMins) * 100))}%` }}
                        title={`${b.iso}: ${b.mins} phút`}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                Tiếp tục đánh giá
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Mức năng lượng & hài lòng tuần này ({energy}/5)
              </label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setEnergy(lv)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-xs font-semibold transition-all",
                      energy === lv
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                    )}
                  >
                    {lv} ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Điều bạn làm tốt nhất tuần này
              </label>
              <textarea
                rows={2}
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="VD: Hoàn thành xong đồ án môn cấu trúc dữ liệu đúng hạn..."
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                1 trọng tâm lớn nhất cho tuần tới
              </label>
              <input
                type="text"
                value={nextFocus}
                onChange={(e) => setNextFocus(e.target.value)}
                placeholder="VD: Ôn xong 3 chương Kinh tế chính trị & làm 2 đề thi thử"
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveReflection}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {saving ? "Đang lưu..." : "Lưu đánh giá & Sang bước 3"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Công việc chưa hoàn thành ({stats.openTodos.length})
                </span>
                <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
              </div>
              {stats.openTodos.length === 0 ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Bạn đã xử lý sạch mọi công việc trong tuần!
                </p>
              ) : (
                <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                  {stats.openTodos.slice(0, 8).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-[var(--text-primary)]">{t.title}</span>
                      <span className="ml-2 shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                        {t.dueDate ? t.dueDate.slice(0, 10) : "Chưa hẹn"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại
              </button>
              <div className="flex gap-2">
                {stats.openTodos.length > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={rolloverUnfinished}
                    className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Dời hết sang tuần mới
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
