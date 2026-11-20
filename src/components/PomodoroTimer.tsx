"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { AmbientType } from "@/lib/ambient-audio";
import { MODE_CONFIG, TimerMode, useTimer } from "./TimerProvider";

export interface SubjectOption {
  id: string;
  name: string;
  color: string;
}

export interface SessionLogItem {
  id: string;
  mode: string;
  status: string;
  plannedMinutes: number;
  actualMinutes: number;
  notes: string | null;
  startedAt: string;
  subjectId: string | null;
}

export function PomodoroTimer({
  subjects,
  sessions,
  focusedTaskTitle,
  onClearFocusedTask,
}: {
  subjects: SubjectOption[];
  sessions: SessionLogItem[];
  focusedTaskTitle: string | null;
  onClearFocusedTask: () => void;
}) {
  const timer = useTimer();
  const [zenMode, setZenMode] = useState(false);

  useEffect(() => {
    if (focusedTaskTitle) {
      timer.setNotes(focusedTaskTitle);
    }
  }, [focusedTaskTitle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (timer.isRunning) timer.pause();
        else timer.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalSeconds = Math.max(1, timer.customMinutes * 60);
  const progress = (totalSeconds - timer.secondsLeft) / totalSeconds;
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className={cn("grid gap-6", zenMode ? "grid-cols-1" : "lg:grid-cols-12")}>
      <section
        className={cn(
          "glass-card rounded-2xl p-6",
          zenMode ? "mx-auto w-full max-w-2xl" : "lg:col-span-7"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--bg-elevated)] p-1">
            {(Object.keys(MODE_CONFIG) as TimerMode[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={timer.isRunning}
                onClick={() => timer.changeMode(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  timer.mode === key
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                )}
              >
                {MODE_CONFIG[key].label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setZenMode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {zenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {zenMode ? "Thoát Zen" : "Chế độ Zen"}
          </button>
        </div>

        {focusedTaskTitle && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3.5 py-2 text-xs">
            <span className="flex items-center gap-2 font-medium text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              Đang tập trung: {focusedTaskTitle}
            </span>
            <button
              type="button"
              onClick={onClearFocusedTask}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Bỏ chọn
            </button>
          </div>
        )}

        <div className="my-7 flex flex-col items-center">
          <div className="relative flex h-64 w-64 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 248 248">
              <circle
                cx="124"
                cy="124"
                r={radius}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="7"
              />
              <circle
                cx="124"
                cy="124"
                r={radius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-5xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
                {formatDuration(timer.secondsLeft)}
              </span>
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                <Keyboard className="h-3 w-3" />
                {timer.isRunning ? "Đang chạy nền — Chuyển tab thoải mái" : "Space để bắt đầu"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex w-full max-w-xs items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>5p</span>
            <input
              type="range"
              min={5}
              max={90}
              step={5}
              disabled={timer.isRunning}
              value={timer.customMinutes}
              onChange={(e) => timer.changeDuration(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]"
            />
            <span>90p</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={timer.selectedSubjectId}
            disabled={timer.isRunning}
            onChange={(e) => timer.setSelectedSubjectId(e.target.value)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">-- Môn học (tùy chọn) --</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={timer.notes}
            onChange={(e) => timer.setNotes(e.target.value)}
            placeholder="Mục tiêu phiên này..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-2">
            {!timer.isRunning ? (
              <button
                type="button"
                onClick={timer.start}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                {timer.activeSessionId ? "Tiếp tục" : "Bắt đầu"}
              </button>
            ) : (
              <button
                type="button"
                onClick={timer.pause}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                <Pause className="h-4 w-4" />
                Tạm dừng
              </button>
            )}

            <button
              type="button"
              onClick={timer.reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="h-4 w-4" />
              Đặt lại
            </button>
          </div>

          <div className="flex items-center gap-2">
            {timer.ambient === "none" ? (
              <VolumeX className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <Volume2 className="h-4 w-4 text-[var(--accent)]" />
            )}
            <select
              value={timer.ambient}
              onChange={(e) => timer.changeAmbient(e.target.value as AmbientType)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] outline-none"
            >
              <option value="none">Âm thanh: Tắt</option>
              <option value="rain">Tiếng mưa dịu</option>
              <option value="brown">Brown Noise tập trung</option>
              <option value="cafe">Quán cà phê êm</option>
              <option value="binaural">Sóng Alpha 10Hz</option>
            </select>
            {timer.ambient !== "none" && (
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={timer.volume}
                onChange={(e) => timer.changeVolume(Number(e.target.value))}
                className="w-16 accent-[var(--accent)]"
              />
            )}
          </div>
        </div>

        {timer.statusMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {timer.statusMessage}
          </div>
        )}
      </section>

      {!zenMode && (
        <section className="glass-card rounded-2xl p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Nhật ký phiên gần đây
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Đồng bộ thời gian thực với PostgreSQL
              </p>
            </div>
            <span className="rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)]">
              {sessions.length} phiên
            </span>
          </div>

          <ul className="mt-4 space-y-2.5">
            {sessions.slice(0, 7).length === 0 ? (
              <li className="rounded-xl border border-dashed border-[var(--border-subtle)] p-8 text-center text-xs text-[var(--text-muted)]">
                Chưa có phiên nào. Nhấn <strong>Space</strong> hoặc bấm <strong>Bắt đầu</strong> để bắt đầu.
              </li>
            ) : (
              sessions.slice(0, 7).map((s) => {
                const sub = s.subjectId ? subjectMap.get(s.subjectId) : undefined;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {sub && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: sub.color }}
                          />
                        )}
                        <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                          {s.notes || sub?.name || `Phiên ${s.mode}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {new Date(s.startedAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                        {s.actualMinutes}p
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-medium",
                          s.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : s.status === "running"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : "bg-zinc-500/15 text-[var(--text-muted)]"
                        )}
                      >
                        {s.status === "completed"
                          ? "Xong"
                          : s.status === "running"
                          ? "Đang chạy"
                          : "Hủy"}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
