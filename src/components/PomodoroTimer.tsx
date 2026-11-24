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
  Droplets,
  Download,
  BellOff,
  Bell,
  Presentation,
  Pencil,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { ambientEngine, AmbientChannel, BellStyle } from "@/lib/ambient-audio";
import { MODE_CONFIG, TimerMode, useTimer } from "./TimerProvider";
import { BreathingModal } from "./BreathingModal";
import { playUiTick } from "@/lib/ui-sounds";

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
  const [clockTab, setClockTab] = useState<"pomodoro" | "exam" | "stopwatch" | "rehearsal">("pomodoro");
  const [rehTargetMins, setRehTargetMins] = useState(10);
  const [rehElapsed, setRehElapsed] = useState(0);
  const [rehRunning, setRehRunning] = useState(false);
  const [muteBell, setMuteBell] = useState(false);
  const [autoBreak, setAutoBreak] = useState(false);
  const [recentPresets, setRecentPresets] = useState<string[]>([]);
  const [focusRatings, setFocusRatings] = useState<number[]>([]);

  useEffect(() => {
    try {
      const rawR = localStorage.getItem("kronoflow-focus-ratings");
      if (rawR) setFocusRatings(JSON.parse(rawR));
    } catch {
      // ignore
    }
  }, []);

  const addFocusRating = (stars: number) => {
    const next = [stars, ...focusRatings].slice(0, 30);
    setFocusRatings(next);
    localStorage.setItem("kronoflow-focus-ratings", JSON.stringify(next));
    playUiTick("check");
  };

  useEffect(() => {
    setMuteBell(localStorage.getItem("kronoflow-mute-bell") === "on");
    setAutoBreak(localStorage.getItem("kronoflow-auto-break") === "on");
    try {
      const raw = localStorage.getItem("kronoflow-recent-focus");
      if (raw) setRecentPresets(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!rehRunning) return;
    const id = setInterval(() => setRehElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [rehRunning]);

  const rememberFocusPreset = (note: string) => {
    const clean = note.trim();
    if (!clean) return;
    const next = [clean, ...recentPresets.filter((x) => x !== clean)].slice(0, 4);
    setRecentPresets(next);
    localStorage.setItem("kronoflow-recent-focus", JSON.stringify(next));
  };

  const exportSessionsCsv = () => {
    const header = "Ngay gio,Che do,So phut,Mon hoc,Ghi chu\n";
    const rows = sessions
      .map((s) => {
        const subName = s.subjectId ? (subjectMap.get(s.subjectId)?.name ?? "") : "";
        return `"${new Date(s.startedAt).toLocaleString("vi-VN")}","${s.mode}",${s.actualMinutes},"${subName.replaceAll('"', '""')}","${(s.notes ?? "").replaceAll('"', '""')}"`;
      })
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [zenMode, setZenMode] = useState(false);
  const [zenTheme, setZenTheme] = useState<"aurora" | "sunset" | "ocean" | "minimal">("aurora");
  const [breathOpen, setBreathOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
  const [waterNudgeDone, setWaterNudgeDone] = useState(false);
  const [focusTag, setFocusTag] = useState("Đang giải đề");
  const [clockStyle, setClockStyle] = useState<"ring" | "flip">("ring");
  const [logRange, setLogRange] = useState<"all" | "today" | "week">("all");
  const [logSubFilter, setLogSubFilter] = useState("all");
  const [logQuery, setLogQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMins, setManualMins] = useState(30);
  const [manualSub, setManualSub] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  const handleDeleteSession = async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      playUiTick("flip");
      onSessionSaved?.();
    }
  };

  const handleClearAllSessions = async () => {
    if (!window.confirm(`Xóa toàn bộ ${sessions.length} phiên trong lịch sử học tập? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    const res = await fetch("/api/sessions", { method: "DELETE" });
    if (res.ok) {
      playUiTick("flip");
      onSessionSaved?.();
    }
  };

  const handleEditSessionNote = async (s: SessionLogItem) => {
    const nextNote = window.prompt("Chỉnh sửa ghi chú cho phiên học này:", s.notes ?? "");
    if (nextNote === null) return;
    const res = await fetch(`/api/sessions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: s.status,
        actualMinutes: s.actualMinutes,
        notes: nextNote.trim() || undefined,
      }),
    });
    if (res.ok) onSessionSaved?.();
  };

  const handleAddManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSaving(true);
    try {
      const startRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: manualSub || null,
          mode: "pomodoro",
          plannedMinutes: manualMins,
          notes: manualNote.trim() || "Phiên học ghi nhận thủ công",
        }),
      });
      if (startRes.ok) {
        const created = await startRes.json();
        const sid = created.data?.id;
        if (sid) {
          await fetch(`/api/sessions/${sid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "completed",
              actualMinutes: manualMins,
              notes: manualNote.trim() || "Phiên học ghi nhận thủ công",
            }),
          });
        }
        setManualNote("");
        setManualOpen(false);
        playUiTick("check");
        onSessionSaved?.();
      }
    } finally {
      setManualSaving(false);
    }
  };
  const [examQuestions, setExamQuestions] = useState(50);
  const [auxTimers, setAuxTimers] = useState<{ id: string; label: string; secs: number; running: boolean }[]>([]);

  useEffect(() => {
    if (!auxTimers.some((t) => t.running && t.secs > 0)) return;
    const id = setInterval(() => {
      setAuxTimers((prev) =>
        prev.map((t) => (t.running && t.secs > 0 ? { ...t, secs: t.secs - 1 } : t))
      );
    }, 1000);
    return () => clearInterval(id);
  }, [auxTimers]);

  const addAuxTimer = (mins: number, label: string) => {
    setAuxTimers((prev) => [
      ...prev.slice(-2),
      { id: String(Date.now()), label, secs: mins * 60, running: true },
    ]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (timer.isRunning) timer.pause();
        else timer.start();
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        timer.reset();
      } else if (e.key.toLowerCase() === "m" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (timer.ambient !== "none") {
          timer.changeAmbient("none");
        } else {
          timer.changeAmbient("rain");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timer]);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const suggestedMins =
    completedSessions.length >= 3
      ? Math.max(
          15,
          Math.min(
            60,
            Math.round(
              completedSessions.reduce((a, b) => a + b.actualMinutes, 0) /
                completedSessions.length /
                5
            ) * 5
          )
        )
      : null;

  const todayCompletedCount = sessions.filter(
    (s) => s.status === "completed" && s.startedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  const logOneWaterCup = () => {
    const key = `kronoflow-water-${new Date().toISOString().slice(0, 10)}`;
    const cur = Number(localStorage.getItem(key) || "0");
    localStorage.setItem(key, String(Math.min(8, (isNaN(cur) ? 0 : cur) + 1)));
    playUiTick("check");
    setWaterNudgeDone(true);
    setTimeout(() => setWaterNudgeDone(false), 3000);
  };

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
      setClockTab("pomodoro");
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
          ? "fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto px-4 py-8 backdrop-blur-xl bg-[var(--bg-canvas)]"
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
          timer.isRunning && "focus-active-glow",
          zenMode ? "mx-auto my-auto w-full max-w-2xl shadow-2xl" : "lg:col-span-7"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
            {(
              [
                ["pomodoro", "Pomodoro"],
                ["exam", "Thi thử (60–120')"],
                ["stopwatch", "Đếm xuôi"],
                ["rehearsal", "Thuyết trình"],
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

          <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !muteBell;
              setMuteBell(next);
              localStorage.setItem("kronoflow-mute-bell", next ? "on" : "off");
            }}
            title={muteBell ? "Chuông hết giờ đang tắt (Thư viện)" : "Tắt chuông hết giờ (Chế độ thư viện)"}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium",
              muteBell
                ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
                : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
            )}
          >
            {muteBell ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{muteBell ? "Tắt chuông" : "Chuông"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !autoBreak;
              setAutoBreak(next);
              localStorage.setItem("kronoflow-auto-break", next ? "on" : "off");
            }}
            title="Tự động chuyển sang 5 phút nghỉ ngắn sau khi hết phiên học"
            className={cn(
              "hidden items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium sm:inline-flex",
              autoBreak
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
            )}
          >
            {autoBreak ? "Tự nghỉ: Bật" : "Tự nghỉ"}
          </button>
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

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[var(--text-muted)]">Trạng thái:</span>
            {["Đang giải đề", "Đang đọc sách", "Viết báo cáo", "Luyện code"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setFocusTag(st);
                  timer.setNotes(st);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 transition-colors",
                  focusTag === st
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            {suggestedMins && (
              <button
                type="button"
                onClick={() => timer.changeDuration(suggestedMins)}
                className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 font-medium text-[var(--accent)]"
              >
                Gợi ý nhịp tối ưu: {suggestedMins}p
              </button>
            )}
            <span className="hidden sm:inline font-mono text-[10px]">Space: Chạy/Dừng · R: Đặt lại · M: Tắt/Mở nhạc nền</span>
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

        {todayCompletedCount >= 2 && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 shrink-0" />
              Đã xong {todayCompletedCount} phiên hôm nay — hãy nhìn xa 20 giây & bổ sung nước!
            </span>
            <button
              type="button"
              onClick={logOneWaterCup}
              className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-sky-700"
            >
              {waterNudgeDone ? "Đã +1 ly ✓" : "+1 ly nước"}
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

        {clockTab === "rehearsal" ? (() => {
          const targetSec = rehTargetMins * 60;
          const warnSec = Math.round(targetSec * 0.8);
          const isOver = rehElapsed > targetSec;
          const isWarn = !isOver && rehElapsed >= warnSec;
          return (
            <div className="my-8 flex flex-col items-center">
              <div className="mb-4 flex items-center gap-2 text-xs">
                <Presentation className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-[var(--text-secondary)]">Thời lượng bài thuyết trình:</span>
                {([5, 10, 15, 20] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={rehRunning}
                    onClick={() => {
                      setRehTargetMins(m);
                      setRehElapsed(0);
                    }}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 font-mono text-xs",
                      rehTargetMins === m
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    )}
                  >
                    {m}p
                  </button>
                ))}
              </div>
              <div
                className={cn(
                  "flex h-56 w-56 flex-col items-center justify-center rounded-full border-4 transition-colors",
                  isOver
                    ? "border-rose-500 bg-rose-500/10"
                    : isWarn
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-[var(--accent)]/40 bg-[var(--bg-canvas)]"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-5xl font-semibold tabular-nums",
                    isOver ? "text-rose-500" : isWarn ? "text-amber-600" : "text-[var(--text-primary)]"
                  )}
                >
                  {formatDuration(rehElapsed)}
                </span>
                <span className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                  {isOver
                    ? `Lố giờ +${formatDuration(rehElapsed - targetSec)}!`
                    : isWarn
                    ? "Sắp hết giờ (≥80%) · Chốt ý!"
                    : `Mục tiêu ${rehTargetMins} phút`}
                </span>
              </div>
              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setRehRunning((r) => !r)}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium"
                >
                  {rehRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {rehRunning ? "Tạm dừng" : "Bắt đầu tập nói"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRehRunning(false);
                    setRehElapsed(0);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs text-[var(--text-secondary)]"
                >
                  <RotateCcw className="h-4 w-4" /> Đặt lại
                </button>
              </div>
            </div>
          );
        })() : clockTab === "stopwatch" ? (
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
            {clockTab === "pomodoro" && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-muted)]">Nhịp sinh học:</span>
                {(
                  [
                    [15, "15' Chống trì hoãn"],
                    [52, "52' Học (52/17)"],
                    [17, "17' Nghỉ"],
                    [90, "90' Ultradian"],
                    [20, "20' Nghỉ sâu"],
                  ] as const
                ).map(([mins, lb]) => (
                  <button
                    key={mins}
                    type="button"
                    disabled={timer.isRunning}
                    onClick={() => timer.changeDuration(mins)}
                    className={cn(
                      "rounded-lg border px-2 py-0.5 transition-colors disabled:opacity-50",
                      timer.customMinutes === mins
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                        : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {lb}
                  </button>
                ))}
              </div>
            )}

            {clockTab === "exam" && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs">
                <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  Số câu đề thi:
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={examQuestions}
                    onChange={(e) => setExamQuestions(Math.max(1, Number(e.target.value)))}
                    className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
                  />
                </label>
                <span className="font-mono text-[var(--accent)]">
                  ≈ {Math.round((timer.customMinutes * 60) / Math.max(1, examQuestions))} giây / câu · Mốc 50% ở phút {Math.round(timer.customMinutes / 2)}
                </span>
              </div>
            )}
            <div className="mt-3 flex justify-center">
              <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setClockStyle("ring")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium",
                    clockStyle === "ring" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
                  )}
                >
                  Vòng tròn
                </button>
                <button
                  type="button"
                  onClick={() => setClockStyle("flip")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium",
                    clockStyle === "flip" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
                  )}
                >
                  Lật số (Flip)
                </button>
              </div>
            </div>

            {clockStyle === "flip" ? (
              <div className="my-8 flex items-center justify-center gap-3">
                {formatDuration(timer.secondsLeft)
                  .split(":")
                  .map((seg, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono text-6xl font-bold tabular-nums text-[var(--text-primary)] shadow-inner">
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] bg-[var(--border-subtle)]" />
                        {seg}
                      </div>
                      {idx === 0 && (
                        <span className="font-mono text-4xl font-bold text-[var(--accent)]">:</span>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
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
                    stroke={subjectMap.get(timer.selectedSubjectId)?.color ?? "var(--accent)"}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span
                    className={cn(
                      "font-mono text-5xl font-bold tracking-tight tabular-nums transition-colors",
                      timer.isRunning && timer.secondsLeft <= 60 && timer.secondsLeft > 0
                        ? "animate-pulse text-rose-500"
                        : "text-[var(--text-primary)]"
                    )}
                  >
                    {formatDuration(timer.secondsLeft)}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                    <Keyboard className="h-3 w-3" />
                    {timer.isRunning ? "Chạy nền — chuyển tab thoải mái" : `${timer.customMinutes} phút`}
                  </span>
                </div>
              </div>
            </div>

            )}
            {clockTab === "pomodoro" && (() => {
              const cyclePos = todayCompletedCount % 4;
              const isCycleComplete = todayCompletedCount > 0 && cyclePos === 0;
              return (
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span>Chu kỳ Pomodoro:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((dot) => {
                      const filled = isCycleComplete ? true : dot <= cyclePos;
                      return (
                        <span
                          key={dot}
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-colors",
                            filled ? "bg-[var(--accent)]" : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                          )}
                        />
                      );
                    })}
                  </div>
                  <span className="font-mono text-[var(--text-primary)]">
                    {isCycleComplete ? "4/4" : `${cyclePos}/4`}
                  </span>
                  {todayFocusedMins > 0 && (
                    <span className="rounded-md bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px]">
                      Học/Nghỉ đề xuất: {todayFocusedMins}p / {Math.round(todayFocusedMins / 5)}p
                    </span>
                  )}
                  {isCycleComplete && (
                    <button
                      type="button"
                      onClick={() => timer.changeMode("long_break")}
                      className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      Đủ 4 phiên · Nghỉ dài 15p →
                    </button>
                  )}
                </div>
              );
            })()}
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
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
              <span>Đánh giá chất lượng phiên:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => addFocusRating(st)}
                    className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 text-amber-500 hover:border-amber-500"
                  >
                    {st}★
                  </button>
                ))}
              </div>
              {focusRatings.length > 0 && (
                <span className="font-mono text-[var(--accent)]">
                  TB: {(focusRatings.reduce((a, b) => a + b, 0) / focusRatings.length).toFixed(1)}★
                </span>
              )}
            </div>
            {recentPresets.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-muted)]">Gần đây:</span>
                {recentPresets.map((rp) => (
                  <button
                    key={rp}
                    type="button"
                    onClick={() => timer.setNotes(rp)}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-0.5 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {rp}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {!timer.isRunning ? (
                <button
                  type="button"
                  onClick={() => { playUiTick("check"); rememberFocusPreset(timer.notes); timer.start(); }}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold"
                >
                  <Play className="h-4 w-4" />
                  {timer.activeSessionId ? "Tiếp tục" : "Bắt đầu phiên"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { playUiTick("flip"); timer.pause(); }}
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
            <div className="flex items-center gap-1.5">
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={exportSessionsCsv}
                  title="Xuất lịch sử phiên học ra Excel/CSV"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                >
                  <Download className="h-3 w-3" /> CSV
                </button>
              )}
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                title="Ghi nhận thêm phiên học thủ công ngoài máy"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Plus className="h-3 w-3" /> Cộng tay
              </button>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSessions}
                  title="Xóa toàn bộ lịch sử phiên học"
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3 w-3" /> Xóa hết
                </button>
              )}
              <span className="rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)]">
                {sessions.length} phiên
              </span>
            </div>
          </div>
          {manualOpen && (
            <form
              onSubmit={handleAddManualSession}
              className="mt-3 space-y-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/40 p-3 text-xs"
            >
              <div className="font-semibold text-[var(--text-primary)]">
                Ghi nhận phiên học thủ công (lưu PostgreSQL)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={5}
                  max={360}
                  value={manualMins}
                  onChange={(e) => setManualMins(Math.max(5, Number(e.target.value)))}
                  placeholder="Số phút"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                />
                <select
                  value={manualSub}
                  onChange={(e) => setManualSub(e.target.value)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs"
                >
                  <option value="">-- Môn học --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Nội dung đã học (VD: Học nhóm thư viện)..."
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={manualSaving}
                  className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {manualSaving ? "..." : "Lưu"}
                </button>
              </div>
            </form>
          )}
          <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="font-medium text-[var(--text-secondary)]">Hẹn giờ phụ song song:</span>
              <div className="flex gap-1">
                {([5, 10, 15] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => addAuxTimer(m, `Hẹn ${m}p`)}
                    className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--accent)]"
                  >
                    +{m}p
                  </button>
                ))}
              </div>
            </div>
            {auxTimers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {auxTimers.map((at) => (
                  <div
                    key={at.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  >
                    <span className="text-[var(--text-muted)]">{at.label}</span>
                    <strong className={at.secs === 0 ? "text-emerald-500" : "text-[var(--accent)]"}>
                      {at.secs === 0 ? "Xong!" : formatDuration(at.secs)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setAuxTimers((p) => p.filter((x) => x.id !== at.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(() => {
            const nowMs = Date.now();
            const filteredLogs = sessions.filter((s) => {
              if (logSubFilter !== "all" && s.subjectId !== logSubFilter) return false;
              if (logQuery.trim() && !(s.notes ?? "").toLowerCase().includes(logQuery.toLowerCase())) return false;
              if (logRange === "today") return s.startedAt.slice(0, 10) === todayIso;
              if (logRange === "week") return nowMs - new Date(s.startedAt).getTime() <= 7 * 86400000;
              return true;
            });
            const rangeMins = filteredLogs.reduce((a, b) => a + b.actualMinutes, 0);
            return (
              <>
                <input
                  type="text"
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="Tìm phiên theo ghi chú..."
                  className="mt-2.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex gap-1">
                    {(
                      [
                        ["all", "Tất cả"],
                        ["today", "Hôm nay"],
                        ["week", "7 ngày"],
                      ] as const
                    ).map(([k, lb]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setLogRange(k)}
                        className={cn(
                          "rounded-lg px-2 py-1 font-medium",
                          logRange === k
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                        )}
                      >
                        {lb}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {subjects.length > 0 && (
                      <select
                        value={logSubFilter}
                        onChange={(e) => setLogSubFilter(e.target.value)}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]"
                      >
                        <option value="all">Mọi môn</option>
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="font-mono text-[var(--text-muted)]">Tổng: {rangeMins}p</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {filteredLogs.slice(0, 8).map((s) => {
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
                  <div className="flex shrink-0 items-center gap-1.5">
                    {s.actualMinutes >= 45 && (
                      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600 dark:text-violet-400">
                        Deep
                      </span>
                    )}
                    <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                      {s.actualMinutes}p
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditSessionNote(s)}
                      title="Sửa ghi chú phiên"
                      className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      title="Xóa phiên học này"
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
                  })}
                </ul>
              </>
            );
          })()}
        </section>
      )}
    </div>
  );
}
