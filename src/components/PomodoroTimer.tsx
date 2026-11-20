"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Sparkles,
  Keyboard,
  Timer as TimerIcon,
  Save,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { ambientEngine, AmbientChannel } from "@/lib/ambient-audio";
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

const SOUND_CHANNELS: { id: AmbientChannel; label: string }[] = [
  { id: "rain", label: "Tiếng mưa dịu" },
  { id: "brown", label: "Brown Noise" },
  { id: "cafe", label: "Quán cà phê" },
  { id: "binaural", label: "Sóng Alpha 10Hz" },
];

export function PomodoroTimer({
  subjects,
  sessions,
  focusedTaskTitle,
  onClearFocusedTask,
  onSessionSaved,
}: {
  subjects: SubjectOption[];
  sessions: SessionLogItem[];
  focusedTaskTitle: string | null;
  onClearFocusedTask: () => void;
  onSessionSaved?: () => void;
}) {
  const timer = useTimer();
  const [clockTab, setClockTab] = useState<"pomodoro" | "exam" | "stopwatch">("pomodoro");
  const [zenMode, setZenMode] = useState(false);

  // Stopwatch state
  const [swSeconds, setSwSeconds] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [swSavedMsg, setSwSavedMsg] = useState<string | null>(null);

  // 4-Channel Sound Mixer volumes
  const [mix, setMix] = useState<Record<AmbientChannel, number>>({
    rain: 0,
    brown: 0,
    cafe: 0,
    binaural: 0,
  });

  useEffect(() => {
    if (focusedTaskTitle) {
      timer.setNotes(focusedTaskTitle);
    }
  }, [focusedTaskTitle]);

  useEffect(() => {
    if (!swRunning) return;
    const id = setInterval(() => setSwSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [swRunning]);

  const handleMixChange = (ch: AmbientChannel, value: number) => {
    setMix((prev) => ({ ...prev, [ch]: value }));
    ambientEngine.setChannelVolume(ch, value);
  };

  const handleSaveStopwatch = async () => {
    const mins = Math.max(1, Math.round(swSeconds / 60));
    setSwRunning(false);
    const createRes = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: timer.selectedSubjectId || null,
        mode: "deep_work",
        plannedMinutes: mins,
        notes: timer.notes.trim() || "Phiên bấm giờ tự do (Stopwatch)",
      }),
    });
    if (createRes.ok) {
      const created = (await createRes.json()).data;
      if (created?.id) {
        await fetch(`/api/sessions/${created.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed", actualMinutes: mins }),
        });
      }
      setSwSeconds(0);
      setSwSavedMsg(`Đã lưu ${mins} phút bấm giờ vào PostgreSQL!`);
      onSessionSaved?.();
      setTimeout(() => setSwSavedMsg(null), 3000);
    }
  };

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
          "glass-card card-lift rounded-2xl p-6",
          zenMode ? "mx-auto w-full max-w-2xl" : "lg:col-span-7"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
            {(
              [
                ["pomodoro", "Pomodoro"],
                ["exam", "Thi thử (60–120')"],
                ["stopwatch", "Đếm xuôi"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setClockTab(k)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium",
                  clockTab === k
                    ? "btn-primary"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setZenMode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
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

        {clockTab === "stopwatch" ? (
          <div className="my-8 flex flex-col items-center">
            <div className="flex h-56 w-56 flex-col items-center justify-center rounded-full border-4 border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-inner">
              <TimerIcon className="h-5 w-5 text-[var(--accent)]" />
              <span className="mt-2 font-mono text-5xl font-semibold tabular-nums text-[var(--text-primary)]">
                {formatDuration(swSeconds)}
              </span>
              <span className="mt-1 text-[11px] text-[var(--text-muted)]">
                {swRunning ? "Đang đếm xuôi..." : "Sẵn sàng bấm giờ tự do"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setSwRunning((r) => !r)}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                {swRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {swRunning ? "Tạm dừng" : "Bắt đầu"}
              </button>
              <button
                type="button"
                disabled={swSeconds < 10}
                onClick={handleSaveStopwatch}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Lưu phiên vào DB
              </button>
              <button
                type="button"
                onClick={() => {
                  setSwRunning(false);
                  setSwSeconds(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
            {swSavedMsg && (
              <p className="mt-3 text-xs font-medium text-emerald-500">{swSavedMsg}</p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {clockTab === "pomodoro"
                ? (Object.keys(MODE_CONFIG) as TimerMode[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={timer.isRunning}
                      onClick={() => timer.changeMode(key)}
                      className={cn(
                        "rounded-lg border px-3 py-1 text-xs font-medium",
                        timer.mode === key
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                      )}
                    >
                      {MODE_CONFIG[key].label}
                    </button>
                  ))
                : [60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      disabled={timer.isRunning}
                      onClick={() => timer.changeDuration(mins)}
                      className={cn(
                        "rounded-lg border px-3.5 py-1 text-xs font-medium",
                        timer.customMinutes === mins
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                      )}
                    >
                      Đề thi {mins} phút
                    </button>
                  ))}
            </div>

            <div className="my-6 flex flex-col items-center">
              <div className="relative flex h-60 w-60 items-center justify-center">
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
                    {timer.isRunning ? "Chạy nền — chuyển tab thoải mái" : `${timer.customMinutes} phút`}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={timer.selectedSubjectId}
                disabled={timer.isRunning}
                onChange={(e) => timer.setSelectedSubjectId(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {!timer.isRunning ? (
                <button
                  type="button"
                  onClick={timer.start}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold"
                >
                  <Play className="h-4 w-4" />
                  {timer.activeSessionId ? "Tiếp tục" : "Bắt đầu phiên"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={timer.pause}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  <Pause className="h-4 w-4" />
                  Tạm dừng
                </button>
              )}
              <button
                type="button"
                onClick={timer.reset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <RotateCcw className="h-4 w-4" />
                Đặt lại
              </button>
            </div>

            {timer.statusMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {timer.statusMessage}
              </div>
            )}
          </>
        )}

        {/* 4-CHANNEL SOUND MIXER */}
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
              Bộ trộn âm thanh tập trung (Sound Mixer — trộn nhiều lớp)
            </span>
            <button
              type="button"
              onClick={() => {
                ambientEngine.stop();
                setMix({ rain: 0, brown: 0, cafe: 0, binaural: 0 });
              }}
              className="text-[11px] text-[var(--text-muted)] hover:text-rose-500"
            >
              Tắt tất cả
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SOUND_CHANNELS.map((ch) => (
              <div
                key={ch.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
              >
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-[var(--text-primary)]">{ch.label}</span>
                  <span className="font-mono text-[var(--accent)]">
                    {Math.round(mix[ch.id] * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.7}
                  step={0.05}
                  value={mix[ch.id]}
                  onChange={(e) => handleMixChange(ch.id, Number(e.target.value))}
                  className="mt-1 h-1.5 w-full cursor-pointer accent-[var(--accent)]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {!zenMode && (
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-[var(--text-primary)]">
                Nhật ký phiên gần đây
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Lưu trữ thời gian thực trên PostgreSQL
              </p>
            </div>
            <span className="rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)]">
              {sessions.length} phiên
            </span>
          </div>

          <ul className="mt-4 space-y-2.5">
            {sessions.slice(0, 8).map((s) => {
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
                  <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                    {s.actualMinutes}p
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
