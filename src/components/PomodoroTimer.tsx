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
  Lightbulb,
  ListOrdered,
  ArrowRight,
  Plus,
  Trash2,
  PictureInPicture2,
  Wind,
  Moon,
  Coffee,
  Zap,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { ambientEngine, AmbientChannel, BellStyle } from "@/lib/ambient-audio";
import { MODE_CONFIG, TimerMode, useTimer } from "./TimerProvider";
import { BreathingModal } from "./BreathingModal";

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
  const [zenTheme, setZenTheme] = useState<"aurora" | "sunset" | "ocean" | "minimal">("aurora");
  const [breathOpen, setBreathOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayFocusedMins = sessions
    .filter((s) => s.status === "completed" && s.startedAt.slice(0, 10) === todayIso)
    .reduce((a, b) => a + b.actualMinutes, 0);

  const applyStudyScene = (scene: "night" | "cafe" | "sprint") => {
    if (scene === "night") {
      timer.changeMode("deep_work");
      timer.changeAmbient("rain");
      timer.changeVolume(0.4);
      localStorage.setItem("kronoflow-warm-filter", "35");
      window.dispatchEvent(new Event("kronoflow-warm-change"));
    } else if (scene === "cafe") {
      timer.changeMode("pomodoro");
      timer.changeAmbient("cafe");
      timer.changeVolume(0.35);
      localStorage.setItem("kronoflow-warm-filter", "0");
      window.dispatchEvent(new Event("kronoflow-warm-change"));
    } else {
      timer.changeMode("deep_work");
      timer.changeAmbient("brown");
      timer.changeVolume(0.3);
      setZenMode(true);
    }
  };
  const [parkingInput, setParkingInput] = useState("");
  const [parkedItems, setParkedItems] = useState<{ id: string; text: string }[]>([]);
  const [flowQueue, setFlowQueue] = useState<
    { id: string; label: string; mode: "pomodoro" | "deep_work" | "short_break" | "long_break"; subjectId: string }[]
  >([]);
  const [flowIdx, setFlowIdx] = useState(0);
  const [flowSubject, setFlowSubject] = useState("");
  const [flowMode, setFlowMode] = useState<"pomodoro" | "deep_work" | "short_break" | "long_break">("pomodoro");

  useEffect(() => {
    try {
      const savedPark = localStorage.getItem("kronoflow-parking-lot");
      if (savedPark) setParkedItems(JSON.parse(savedPark));
      const savedFlow = localStorage.getItem("kronoflow-study-flow");
      if (savedFlow) setFlowQueue(JSON.parse(savedFlow));
    } catch {
      // ignore
    }
  }, []);

  const saveParked = (next: { id: string; text: string }[]) => {
    setParkedItems(next);
    localStorage.setItem("kronoflow-parking-lot", JSON.stringify(next));
  };

  const addParked = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parkingInput.trim()) return;
    saveParked([{ id: String(Date.now()), text: parkingInput.trim() }, ...parkedItems].slice(0, 12));
    setParkingInput("");
  };

  const promoteParkedToTodo = async (item: { id: string; text: string }) => {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: item.text, priority: "medium" }),
    });
    saveParked(parkedItems.filter((x) => x.id !== item.id));
    onSessionSaved?.();
  };

  const saveFlow = (
    next: { id: string; label: string; mode: "pomodoro" | "deep_work" | "short_break" | "long_break"; subjectId: string }[]
  ) => {
    setFlowQueue(next);
    localStorage.setItem("kronoflow-study-flow", JSON.stringify(next));
  };

  const addFlowStep = () => {
    const subName = subjects.find((s) => s.id === flowSubject)?.name;
    const modeLabel =
      flowMode === "pomodoro"
        ? "25p Pomodoro"
        : flowMode === "deep_work"
        ? "50p Deep Work"
        : flowMode === "short_break"
        ? "5p Nghỉ ngắn"
        : "15p Nghỉ dài";
    saveFlow([
      ...flowQueue,
      {
        id: String(Date.now()),
        label: subName ? `${modeLabel} · ${subName}` : modeLabel,
        mode: flowMode,
        subjectId: flowSubject,
      },
    ]);
  };

  const runFlowStep = (idx: number) => {
    const step = flowQueue[idx];
    if (!step) return;
    setFlowIdx(idx);
    timer.changeMode(step.mode);
    if (step.subjectId) timer.setSelectedSubjectId(step.subjectId);
    timer.setNotes(step.label);
  };
  const [eyeCare, setEyeCare] = useState(true);
  const [bellStyle, setBellStyle] = useState<BellStyle>("soft");

  useEffect(() => {
    const saved = localStorage.getItem("kronoflow-bell") as BellStyle | null;
    if (saved) setBellStyle(saved);
  }, []);

  const changeBell = (next: BellStyle) => {
    setBellStyle(next);
    localStorage.setItem("kronoflow-bell", next);
    ambientEngine.playBell(next);
  };

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

  const zenBackdropStyle: React.CSSProperties | undefined = zenMode
    ? {
        backgroundImage:
          zenTheme === "aurora"
            ? "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.22), transparent 50%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.24), transparent 50%), linear-gradient(135deg, #0f172a, #1e1b4b)"
            : zenTheme === "sunset"
            ? "radial-gradient(circle at 25% 25%, rgba(251,146,60,0.28), transparent 50%), radial-gradient(circle at 75% 75%, rgba(244,63,94,0.25), transparent 50%), linear-gradient(135deg, #1c1917, #3b1d2e)"
            : zenTheme === "ocean"
            ? "radial-gradient(circle at 30% 20%, rgba(45,212,191,0.22), transparent 55%), linear-gradient(135deg, #042f2e, #0f172a)"
            : undefined,
      }
    : undefined;

  return (
    <div
      className={cn(
        "grid gap-6",
        zenMode
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-6 backdrop-blur-xl bg-[var(--bg-canvas)]"
          : "lg:grid-cols-12"
      )}
      style={zenBackdropStyle}
    >
      {zenMode && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] text-white backdrop-blur-md">
          <span className="mr-1 opacity-75">Zen Cinema:</span>
          {(
            [
              ["aurora", "Aurora"],
              ["sunset", "Hoàng hôn"],
              ["ocean", "Đại dương"],
              ["minimal", "Tối giản"],
            ] as const
          ).map(([k, lb]) => (
            <button
              key={k}
              type="button"
              onClick={() => setZenTheme(k)}
              className={cn(
                "rounded-full px-2.5 py-0.5 transition-colors",
                zenTheme === k ? "bg-white text-slate-900 font-semibold" : "hover:bg-white/15"
              )}
            >
              {lb}
            </button>
          ))}
        </div>
      )}
      <section
        className={cn(
          "glass-card card-lift rounded-2xl p-6",
          zenMode ? "mx-auto w-full max-w-2xl shadow-2xl" : "lg:col-span-7"
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
            onClick={() => {
              const next = !zenMode;
              setZenMode(next);
              if (next && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else if (!next && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
          >
            {zenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {zenMode ? "Thoát Toàn màn hình" : "Toàn màn hình"}
          </button>
        </div>

        {/* STUDY SCENE PRESETS + PiP + BREATHING 4-7-8 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[var(--text-muted)]">Kịch bản nhanh:</span>
            <button
              type="button"
              onClick={() => applyStudyScene("night")}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Moon className="h-3 w-3" /> Ôn thi khuya
            </button>
            <button
              type="button"
              onClick={() => applyStudyScene("cafe")}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Coffee className="h-3 w-3" /> Cà phê sáng
            </button>
            <button
              type="button"
              onClick={() => applyStudyScene("sprint")}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Zap className="h-3 w-3" /> Nước rút 50p
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPipOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 font-medium text-[var(--accent)]"
            >
              <PictureInPicture2 className="h-3 w-3" /> {pipOpen ? "Đóng nổi" : "Đồng hồ nổi"}
            </button>
            <button
              type="button"
              onClick={() => setBreathOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-600 dark:text-emerald-400"
            >
              <Wind className="h-3 w-3" /> Thở 4-7-8
            </button>
          </div>
        </div>

        {todayFocusedMins >= 180 && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <span>
              Bạn đã tập trung {todayFocusedMins} phút hôm nay. Hãy nghỉ 5 phút và thử bài tập thở 4-7-8 để tránh quá tải nhé!
            </span>
            <button
              type="button"
              onClick={() => setBreathOpen(true)}
              className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white"
            >
              Thở ngay
            </button>
          </div>
        )}

        <BreathingModal open={breathOpen} onClose={() => setBreathOpen(false)} />

        {pipOpen && (
          <div className="fixed bottom-24 left-5 z-50 flex items-center gap-3 rounded-2xl border border-[var(--accent)]/50 bg-[var(--bg-surface)]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md">
            <div>
              <div className="text-[10px] font-medium text-[var(--text-muted)]">Đồng hồ nổi</div>
              <div className="font-mono text-xl font-bold tabular-nums text-[var(--accent)]">
                {formatDuration(timer.secondsLeft)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => (timer.isRunning ? timer.pause() : timer.start())}
              className="btn-primary rounded-xl p-2"
            >
              {timer.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setPipOpen(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          </div>
        )}

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

            {/* BÃI ĐỖ XAO NHÃNG (Distraction Parking Lot) */}
            <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 text-left">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--text-primary)]">
                <span className="flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Bãi đỗ xao nhãng ({parkedItems.length})
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Ghi nhanh để không rời phiên</span>
              </div>
              <form onSubmit={addParked} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={parkingInput}
                  onChange={(e) => setParkingInput(e.target.value)}
                  placeholder="Chợt nhớ việc gì? Đỗ tạm vào đây..."
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)]"
                >
                  Đỗ tạm
                </button>
              </form>
              {parkedItems.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {parkedItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-[var(--text-secondary)]">{it.text}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => promoteParkedToTodo(it)}
                          className="inline-flex items-center gap-0.5 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                        >
                          <ArrowRight className="h-3 w-3" /> Todo
                        </button>
                        <button
                          type="button"
                          onClick={() => saveParked(parkedItems.filter((x) => x.id !== it.id))}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* CHUỖI POMODORO TỰ ĐỘNG (Study Flow Queue) */}
            {!zenMode && (
              <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 text-left">
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-primary)]">
                  <span className="flex items-center gap-1.5">
                    <ListOrdered className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Chuỗi phiên học (Study Flow · {flowQueue.length} bước)
                  </span>
                  {flowQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => runFlowStep((flowIdx + 1) % flowQueue.length)}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Bước tiếp theo →
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <select
                    value={flowMode}
                    onChange={(e) =>
                      setFlowMode(e.target.value as "pomodoro" | "deep_work" | "short_break" | "long_break")
                    }
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-primary)]"
                  >
                    <option value="pomodoro">25p Pomodoro</option>
                    <option value="deep_work">50p Deep Work</option>
                    <option value="short_break">5p Nghỉ ngắn</option>
                    <option value="long_break">15p Nghỉ dài</option>
                  </select>
                  <select
                    value={flowSubject}
                    onChange={(e) => setFlowSubject(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-primary)]"
                  >
                    <option value="">-- Môn học --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addFlowStep}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
                  >
                    <Plus className="h-3 w-3" /> Thêm bước
                  </button>
                </div>
                {flowQueue.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {flowQueue.map((st, idx) => (
                      <div
                        key={st.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
                          idx === flowIdx
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                            : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        )}
                      >
                        <button type="button" onClick={() => runFlowStep(idx)}>
                          {idx + 1}. {st.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveFlow(flowQueue.filter((x) => x.id !== st.id))}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 4-CHANNEL SOUND MIXER + EYE CARE 20-20-20 */}
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs">
            <span className="text-[var(--text-secondary)]">Kiểu chuông hết phiên</span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  ["soft", "Êm dịu"],
                  ["zen", "Chuông Thiền"],
                  ["bright", "Năng lượng"],
                ] as const
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => changeBell(id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-medium",
                    bellStyle === id
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs">
            <span className="text-[var(--text-secondary)]">
              Nhắc nghỉ mắt 20-20-20 (nhìn xa 6m mỗi 20 phút)
            </span>
            <button
              type="button"
              onClick={() => setEyeCare((v) => !v)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium",
                eyeCare
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}
            >
              {eyeCare ? "Đang bật" : "Đã tắt"}
            </button>
          </div>
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
