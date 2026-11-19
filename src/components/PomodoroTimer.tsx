"use client";

import { useEffect, useRef, useState } from "react";
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
import { ambientEngine, AmbientType } from "@/lib/ambient-audio";

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

type TimerMode = "pomodoro" | "deep_work" | "short_break" | "long_break";

const MODE_CONFIG: Record<TimerMode, { label: string; minutes: number }> = {
  pomodoro: { label: "Pomodoro 25'", minutes: 25 },
  deep_work: { label: "Deep Work 50'", minutes: 50 },
  short_break: { label: "Nghỉ ngắn 5'", minutes: 5 },
  long_break: { label: "Nghỉ dài 15'", minutes: 15 },
};

export function PomodoroTimer({
  subjects,
  sessions,
  focusedTaskTitle,
  onClearFocusedTask,
  onSessionCompleted,
}: {
  subjects: SubjectOption[];
  sessions: SessionLogItem[];
  focusedTaskTitle: string | null;
  onClearFocusedTask: () => void;
  onSessionCompleted: () => void;
}) {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [ambient, setAmbient] = useState<AmbientType>("none");
  const [volume, setVolume] = useState(0.25);
  const [zenMode, setZenMode] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  activeSessionRef.current = activeSessionId;

  useEffect(() => {
    if (focusedTaskTitle) {
      setNotes(focusedTaskTitle);
    }
  }, [focusedTaskTitle]);

  useEffect(() => {
    const worker = new Worker("/workers/timer-worker.js");
    workerRef.current = worker;

    worker.onmessage = async (event) => {
      const { type, remainingSeconds } = event.data;
      if (type === "TICK") {
        setSecondsLeft(remainingSeconds);
      }
      if (type === "DONE") {
        setIsRunning(false);
        ambientEngine.stop();
        ambientEngine.playBell();
        setAmbient("none");
        if (activeSessionRef.current) {
          await fetch(`/api/sessions/${activeSessionRef.current}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "completed",
              actualMinutes: customMinutes,
              notes: notes.trim() || undefined,
            }),
          });
          setActiveSessionId(null);
        }
        setStatusMessage("Hoàn thành phiên tập trung — Đã phát chuông & ghi vào PostgreSQL.");
        onSessionCompleted();
      }
    };

    return () => {
      worker.terminate();
      ambientEngine.stop();
    };
  }, [customMinutes, notes, onSessionCompleted]);

  const handleModeChange = (nextMode: TimerMode) => {
    if (isRunning) return;
    const mins = MODE_CONFIG[nextMode].minutes;
    setMode(nextMode);
    setCustomMinutes(mins);
    setSecondsLeft(mins * 60);
    setStatusMessage(null);
  };

  const handleDurationSlider = (mins: number) => {
    if (isRunning) return;
    setCustomMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const handleAmbientChange = (next: AmbientType) => {
    setAmbient(next);
    if (next === "none") {
      ambientEngine.stop();
    } else {
      ambientEngine.start(next, volume);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    ambientEngine.setVolume(val);
  };

  const handleStart = async () => {
    if (isRunning) return;
    setStatusMessage(null);

    if (!activeSessionId) {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId || null,
          mode,
          plannedMinutes: customMinutes,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setActiveSessionId(json.data?.id ?? null);
      }
    }

    setIsRunning(true);
    workerRef.current?.postMessage({
      type: "START",
      durationSeconds: secondsLeft,
    });
  };

  const handlePause = () => {
    setIsRunning(false);
    workerRef.current?.postMessage({ type: "PAUSE" });
  };

  const handleReset = async () => {
    setIsRunning(false);
    workerRef.current?.postMessage({ type: "RESET" });

    if (activeSessionId) {
      const elapsedMinutes = Math.max(
        0,
        Math.round((customMinutes * 60 - secondsLeft) / 60)
      );
      await fetch(`/api/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "aborted",
          actualMinutes: elapsedMinutes,
        }),
      });
      setActiveSessionId(null);
      onSessionCompleted();
    }
    setSecondsLeft(customMinutes * 60);
  };

  // Phím tắt Space để Start/Pause nhanh (khi không gõ input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isRunning) handlePause();
        else handleStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalSeconds = Math.max(1, customMinutes * 60);
  const progress = (totalSeconds - secondsLeft) / totalSeconds;
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className={cn("grid gap-6", zenMode ? "grid-cols-1" : "lg:grid-cols-12")}>
      <section
        className={cn(
          "rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6",
          zenMode ? "mx-auto w-full max-w-2xl" : "lg:col-span-7"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--bg-elevated)] p-1">
            {(Object.keys(MODE_CONFIG) as TimerMode[]).map((key) => (
              <button
                key={key}
                type="button"
                disabled={isRunning}
                onClick={() => handleModeChange(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  mode === key
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
                {formatDuration(secondsLeft)}
              </span>
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                <Keyboard className="h-3 w-3" />
                {isRunning ? "Space để tạm dừng" : "Space để bắt đầu"}
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
              disabled={isRunning}
              value={customMinutes}
              onChange={(e) => handleDurationSlider(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]"
            />
            <span>90p</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={selectedSubjectId}
            disabled={isRunning}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mục tiêu phiên này..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                {activeSessionId ? "Tiếp tục" : "Bắt đầu"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                <Pause className="h-4 w-4" />
                Tạm dừng
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="h-4 w-4" />
              Đặt lại
            </button>
          </div>

          <div className="flex items-center gap-2">
            {ambient === "none" ? (
              <VolumeX className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <Volume2 className="h-4 w-4 text-[var(--accent)]" />
            )}
            <select
              value={ambient}
              onChange={(e) => handleAmbientChange(e.target.value as AmbientType)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] outline-none"
            >
              <option value="none">Âm thanh: Tắt</option>
              <option value="rain">Tiếng mưa dịu</option>
              <option value="brown">Brown Noise tập trung</option>
              <option value="cafe">Quán cà phê êm</option>
              <option value="binaural">Sóng Alpha 10Hz</option>
            </select>
            {ambient !== "none" && (
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-16 accent-[var(--accent)]"
              />
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {statusMessage}
          </div>
        )}
      </section>

      {!zenMode && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:col-span-5">
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
                Chưa có phiên nào. Nhấn <strong>Space</strong> hoặc bấm <strong>Bắt đầu</strong> để bắt đầu phiên đầu tiên.
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
                            ? "bg-emerald-500/15 text-emerald-500"
                            : s.status === "running"
                            ? "bg-indigo-500/15 text-indigo-400"
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
