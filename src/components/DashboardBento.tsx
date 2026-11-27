"use client";

import { kfNotify } from "@/lib/notify";

import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";
import {
  Flame,
  Snowflake,
  Play,
  Plus,
  Trash2,
  Trophy,
  Target,
  CheckCircle2,
  Layers,
  Clock,
  RefreshCw,
  Droplets,
  Moon,
  Dices,
  SlidersHorizontal,
  AlertTriangle,
  ExternalLink,
  CalendarCheck2,
  Pin,
  Download,
  Compass,
  CalendarRange,
  Copy,
  Check,
  Image,
  Sparkles,
  Sunrise,
  History,
  GraduationCap,
  RotateCcw,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { computeLevelInfo } from "@/lib/themes";
import { useLang } from "@/lib/i18n";
import { SmartCalendar } from "./SmartCalendar";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import type { RoadmapRecord } from "./RoadmapPanel";
import type { FlashcardRecord, NoteRecord } from "./NotesFlashcardsPanel";
import type { TimeBlockRecord } from "./GoalsTimeblockPanel";
import type { ResourceRecord } from "./HabitsVaultPanel";
import type { ScheduleSlotRecord } from "./ScheduleGpaPanel";
import { ReverseExamPlannerModal } from "./ReverseExamPlannerModal";

export interface UserProfile {
  id: string;
  name: string;
  bio: string;
  dailyGoalMinutes: number;
  streakFreezes: number;
  frozenDates: string;
  theme: string;
  wallpaper: string;
  avatarUrl?: string | null;
}

export interface ExamRecord {
  id: string;
  title: string;
  examDate: string;
  color: string;
}

const QUOTES_VI = [
  "Kỷ luật nhỏ mỗi ngày tạo nên khác biệt lớn sau một học kỳ.",
  "Không cần hoàn hảo ngay lập tức — chỉ cần bắt đầu 25 phút đầu tiên.",
  "Tập trung sâu 2 giờ đáng giá hơn 8 giờ làm việc xao nhãng.",
  "Mỗi phiên Pomodoro hoàn thành là một viên gạch xây tương lai.",
];

const QUOTES_EN = [
  "Small daily discipline compounds into extraordinary results.",
  "You don't need perfection — just start the first 25 minutes.",
  "Two hours of deep focus beats eight hours of distracted work.",
  "Consistency turns difficult goals into effortless habits.",
];

export function DashboardBento({
  user,
  subjects,
  sessions,
  todos,
  roadmaps,
  flashcards,
  exams,
  timeBlocks = [],
  notes = [],
  resources = [],
  slots = [],
  onJumpFocus,
  onOpenWeeklyReview,
  onResumeTab,
  onRefresh,
}: {
  user: UserProfile | null;
  subjects: SubjectOption[];
  sessions: SessionLogItem[];
  todos: TodoItem[];
  roadmaps: RoadmapRecord[];
  flashcards: FlashcardRecord[];
  exams: ExamRecord[];
  timeBlocks?: TimeBlockRecord[];
  notes?: NoteRecord[];
  resources?: ResourceRecord[];
  slots?: ScheduleSlotRecord[];
  onJumpFocus: (taskTitle?: string) => void;
  onOpenWeeklyReview?: () => void;
  onResumeTab?: (tabId: string) => void;
  onRefresh: () => void;
}) {
  const [pinnedResourceIds, setPinnedResourceIds] = useState<string[]>([]);
  const [dismissedGuard, setDismissedGuard] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [cleanMode, setCleanMode] = useState(false);
  const [coverPreset, setCoverPreset] = useState("none");
  const [copiedStandup, setCopiedStandup] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  const quickUpdateGoal = async (mins: number) => {
    setEditingGoal(false);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoalMinutes: mins }),
      });
      if (res.ok) onRefresh();
    } catch {
      // ignore
    }
  };
  const [copiedAgenda, setCopiedAgenda] = useState(false);

  const copyTodayAgenda = () => {
    const todayBlocks = timeBlocks.filter((b) => b.blockDate === todayKey);
    const openTodos = todos.filter((t) => !t.isCompleted).slice(0, 6);
    const lines = [`🗓 Lịch học ngày ${todayKey}`];
    if (todayBlocks.length > 0) {
      lines.push("— Khung giờ (Time Blocks):");
      for (const b of todayBlocks) lines.push(`  • ${b.startTime}-${b.endTime}: ${b.title}`);
    }
    if (openTodos.length > 0) {
      lines.push("— Việc ưu tiên:");
      for (const td of openTodos) lines.push(`  • [ ] ${td.title}`);
    }
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopiedAgenda(true);
    setTimeout(() => setCopiedAgenda(false), 1800);
  };
  const [recallFlipped, setRecallFlipped] = useState(false);
  const [customQuotes, setCustomQuotes] = useState<string[]>([]);
  const [kickoffBusy, setKickoffBusy] = useState(false);
  const [lastContextTab, setLastContextTab] = useState<string | null>(null);
  const [openExamCheckId, setOpenExamCheckId] = useState<string | null>(null);
  const [hidePastExams, setHidePastExams] = useState(false);
  const [semEndDate, setSemEndDate] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "sessions" | "todos">("all");

  const handleDeleteRecentSession = async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  };

  const handleClearRecentSessions = async () => {
    if (!window.confirm(`Xóa toàn bộ ${sessions.length} phiên học trong lịch sử?`)) return;
    const res = await fetch("/api/sessions", { method: "DELETE" });
    if (res.ok) onRefresh();
  };

  useEffect(() => {
    const savedEnd = localStorage.getItem("kronoflow-sem-end");
    if (savedEnd) setSemEndDate(savedEnd);
  }, []);
  const [examChecks, setExamChecks] = useState<Record<string, string[]>>({});
  const EXAM_PREP_STEPS = ["In đề cương", "Ôn công thức", "Xem Sổ Lỗi Sai", "Làm đề bấm giờ"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-exam-checklists");
      if (raw) setExamChecks(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const toggleExamStep = (examId: string, step: string) => {
    const cur = examChecks[examId] ?? [];
    const nextSteps = cur.includes(step) ? cur.filter((x) => x !== step) : [...cur, step];
    const updated = { ...examChecks, [examId]: nextSteps };
    setExamChecks(updated);
    localStorage.setItem("kronoflow-exam-checklists", JSON.stringify(updated));
  };

  useEffect(() => {
    const saved = localStorage.getItem("kronoflow-last-context");
    if (saved && saved !== "dashboard") setLastContextTab(saved);
  }, []);

  const nextClassToday = (() => {
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay();
    const nowM = now.getHours() * 60 + now.getMinutes();
    const todaySlots = slots
      .filter((s) => s.dayOfWeek === dow)
      .map((s) => {
        const [h, m] = s.startTime.split(":").map(Number);
        const startM = (h ?? 0) * 60 + (m ?? 0);
        return { ...s, startM, diffM: startM - nowM };
      })
      .filter((s) => s.diffM >= -15)
      .sort((a, b) => a.startM - b.startM);
    return todaySlots[0] ?? null;
  })();

  useEffect(() => {
    try {
      const rawQ = localStorage.getItem("kronoflow-custom-quotes");
      if (rawQ) setCustomQuotes(JSON.parse(rawQ));
    } catch {
      // ignore
    }
  }, []);

  const addCustomQuote = () => {
    const q = window.prompt("Nhập câu trích dẫn / châm ngôn cá nhân của bạn:");
    if (!q || !q.trim()) return;
    const next = [q.trim(), ...customQuotes].slice(0, 15);
    setCustomQuotes(next);
    localStorage.setItem("kronoflow-custom-quotes", JSON.stringify(next));
    setQuoteIdx(0);
  };

  const handleMorningKickoff = async () => {
    setKickoffBusy(true);
    try {
      const overdue = todos.filter(
        (t) => !t.isCompleted && t.dueDate && t.dueDate.slice(0, 10) < todayKey
      );
      await Promise.all(
        overdue.slice(0, 10).map((t) =>
          fetch(`/api/todos/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dueDate: todayKey }),
          })
        )
      );
      onRefresh();
      onJumpFocus("Khởi động ngày mới · Phiên tập trung #1");
    } finally {
      setKickoffBusy(false);
    }
  };

  const handleExamToGpa = async (ex: ExamRecord) => {
    const raw = window.prompt(`Nhập điểm hệ 10 đạt được cho "${ex.title}" (VD: 8.5):`, "8.5");
    if (!raw) return;
    const score = Number(raw);
    if (isNaN(score) || score < 0 || score > 10) return;
    await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseName: ex.title,
        credits: 3,
        score10: score,
        semester: "HK hiện tại",
      }),
    });
    onRefresh();
  };

  useEffect(() => {
    const savedCover = localStorage.getItem("kronoflow-cover-banner");
    if (savedCover) setCoverPreset(savedCover);
    setCleanMode(localStorage.getItem("kronoflow-clean-dashboard") === "on");
  }, []);

  const cycleCover = () => {
    const order = ["none", "sunrise", "forest", "aurora"];
    const next = order[(order.indexOf(coverPreset) + 1) % order.length] ?? "none";
    setCoverPreset(next);
    localStorage.setItem("kronoflow-cover-banner", next);
  };

  const toggleCleanMode = () => {
    const next = !cleanMode;
    setCleanMode(next);
    localStorage.setItem("kronoflow-clean-dashboard", next ? "on" : "off");
  };

  const copyDailyStandup = () => {
    const summary = `📅 ${todayKey} | ⏱ Tập trung: ${todayMinutes}/${dailyGoal} phút (${goalPct}%) | ✅ Xong ${completedTodos} việc | 🔥 Chuỗi ${streak} ngày`;
    navigator.clipboard?.writeText(summary).catch(() => {});
    setCopiedStandup(true);
    setTimeout(() => setCopiedStandup(false), 1800);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-vault-meta");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { pinned?: boolean }>;
        setPinnedResourceIds(Object.entries(parsed).filter(([, v]) => v?.pinned).map(([k]) => k));
      }
    } catch {
      // ignore
    }
  }, [resources]);
  const { lang } = useLang();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [waterCups, setWaterCups] = useState(0);
  const [wakeTime, setWakeTime] = useState("06:30");
  const [showCust, setShowCust] = useState(false);
  const [widgets, setWidgets] = useState({
    kpi: true,
    calendar: true,
    hydration: true,
    sleep: true,
  });

  useEffect(() => {
    try {
      const savedW = localStorage.getItem("kronoflow-dash-widgets");
      if (savedW) setWidgets((prev) => ({ ...prev, ...JSON.parse(savedW) }));
    } catch {
      // ignore
    }
  }, []);

  const toggleWidget = (key: keyof typeof widgets) => {
    setWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("kronoflow-dash-widgets", JSON.stringify(next));
      return next;
    });
  };

  const calcSleepTimes = (wake: string) => {
    const [hh, mm] = wake.split(":").map(Number);
    const totalWake = (hh ?? 6) * 60 + (mm ?? 30);
    return [6, 5, 4].map((cycles) => {
      let bedMins = totalWake - cycles * 90 - 15;
      while (bedMins < 0) bedMins += 1440;
      const bh = String(Math.floor(bedMins / 60)).padStart(2, "0");
      const bm = String(bedMins % 60).padStart(2, "0");
      return { cycles, hours: (cycles * 1.5).toFixed(1), time: `${bh}:${bm}` };
    });
  };
  const sleepOptions = calcSleepTimes(wakeTime);

  useEffect(() => {
    const key = `kronoflow-water-${new Date().toISOString().slice(0, 10)}`;
    const saved = Number(localStorage.getItem(key) || "0");
    if (!Number.isNaN(saved)) setWaterCups(saved);
  }, []);

  const updateWater = (n: number) => {
    const next = n === waterCups ? n - 1 : n;
    setWaterCups(next);
    const key = `kronoflow-water-${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, String(next));
  };

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nowDate = new Date(nowMs);
  const nowClock = nowDate.toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const hour = nowDate.getHours();
  const greeting =
    lang === "vi"
      ? hour < 12
        ? "Chào buổi sáng"
        : hour < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối"
      : hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const totalMinutes = completedSessions.reduce((a, b) => a + b.actualMinutes, 0);
  const completedTodos = todos.filter((t) => t.isCompleted).length;
  const masteredCards = flashcards.filter((c) => c.mastery >= 4).length;
  const levelInfo = computeLevelInfo(totalMinutes, completedTodos, masteredCards);

  const dayMap = new Map<string, number>();
  for (const s of completedSessions) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + s.actualMinutes);
  }

  let frozenDates: string[] = [];
  try {
    frozenDates = JSON.parse(user?.frozenDates || "[]");
  } catch {
    frozenDates = [];
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMinutes = dayMap.get(todayKey) ?? 0;
  const dailyGoal = user?.dailyGoalMinutes ?? 120;
  const goalPct = Math.min(100, Math.round((todayMinutes / Math.max(1, dailyGoal)) * 100));

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const k = cursor.toISOString().slice(0, 10);
    const active = (dayMap.get(k) ?? 0) > 0 || frozenDates.includes(k);
    if (active) streak++;
    else if (i > 0) break;
    cursor.setDate(cursor.getDate() - 1);
  }

  const isTodayFrozen = frozenDates.includes(todayKey);

  const handleUseFreeze = async () => {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useStreakFreezeForDate: todayKey }),
    });
    onRefresh();
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !examDate) return;
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: examTitle.trim(), examDate }),
    });
    if (res.ok) {
      setExamTitle("");
      setExamDate("");
      onRefresh();
    }
  };

  const handleDeleteExam = async (id: string) => {
    await fetch(`/api/exams/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const allRoadmapItems = roadmaps.flatMap((r) => r.items);
  const doneRoadmapItems = allRoadmapItems.filter((i) => i.status === "done").length;
  const roadmapPct =
    allRoadmapItems.length > 0 ? Math.round((doneRoadmapItems / allRoadmapItems.length) * 100) : 0;

  const pinnedNotes = notes.filter((n) => n.pinned).slice(0, 3);
  const dailyQuests = [
    { label: lang === "vi" ? "Tập trung ít nhất 25 phút hôm nay" : "Focus at least 25m today", done: todayMinutes >= 25 },
    { label: lang === "vi" ? "Hoàn thành ít nhất 2 công việc" : "Complete at least 2 tasks", done: completedTodos >= 2 },
    { label: lang === "vi" ? "Uống ít nhất 4 ly nước" : "Drink at least 4 cups of water", done: waterCups >= 4 },
  ];

  const pendingTodos = todos.filter((t) => !t.isCompleted).slice(0, 5);
  const quotes = [...customQuotes, ...(lang === "vi" ? QUOTES_VI : QUOTES_EN)];

  // Kỳ thi gần nhất cho Spotlight Countdown (Ngày : Giờ : Phút : Giây)
  const upcomingExam = exams.find((e) => new Date(e.examDate).getTime() > nowMs);
  const spotlightDiff = upcomingExam
    ? Math.max(0, Math.floor((new Date(upcomingExam.examDate).getTime() - nowMs) / 1000))
    : 0;
  const spDays = Math.floor(spotlightDiff / 86400);
  const spHours = Math.floor((spotlightDiff % 86400) / 3600);
  const spMins = Math.floor((spotlightDiff % 3600) / 60);
  const spSecs = spotlightDiff % 60;

  const currentHour = new Date().getHours();
  const showStreakGuard = !dismissedGuard && currentHour >= 21 && todayMinutes === 0;
  const pinnedVault = resources.filter((r) => pinnedResourceIds.includes(r.id)).slice(0, 4);

  return (
    <div className="space-y-6">
      {showStreakGuard && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Cảnh báo giữ chuỗi (Streak Guard):</strong> Đã qua 21:00 nhưng hôm nay bạn chưa hoàn thành phiên tập trung nào.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJumpFocus("Phiên giữ chuỗi nhanh 15 phút")}
              className="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-medium"
            >
              Vào phiên nhanh
            </button>
            <button
              type="button"
              onClick={() => setDismissedGuard(true)}
              className="rounded-lg px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Ẩn
            </button>
          </div>
        </div>
      )}

      {/* LIVE HERO BRIEF */}
      <section className="glass-card relative overflow-hidden p-6 sm:p-7">
        {coverPreset !== "none" && (
          <div
            className="-mx-6 -mt-6 mb-5 h-20 sm:-mx-7 sm:-mt-7"
            style={{
              backgroundImage:
                coverPreset === "sunrise"
                  ? "linear-gradient(120deg, #fde68a 0%, #fca5a5 50%, #c4b5fd 100%)"
                  : coverPreset === "forest"
                  ? "linear-gradient(120deg, #064e3b 0%, #0f766e 50%, #34d399 100%)"
                  : "linear-gradient(120deg, #0f172a 0%, #312e81 55%, #0ea5e9 100%)",
            }}
          />
        )}
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Cấp {levelInfo.level} · {levelInfo.rank} ({levelInfo.xp} XP)
              </span>
              <span
                title={`Tuần ${Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7)} của tháng · ${new Date().toLocaleDateString("vi-VN")}`}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1 font-mono text-xs text-[var(--accent)]"
              >
                {nowClock}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className={cn(
                    "h-12 w-12 rounded-full border-2 object-cover ring-2 ring-offset-2 ring-offset-[var(--bg-surface)]",
                    levelInfo.level >= 8
                      ? "border-cyan-400 ring-cyan-400"
                      : levelInfo.level >= 5
                      ? "border-emerald-400 ring-emerald-400"
                      : levelInfo.level >= 3
                      ? "border-amber-400 ring-amber-400"
                      : "border-[var(--accent)] ring-[var(--accent)]/40"
                  )}
                  title={`Khung hạng Cấp ${levelInfo.level} · ${levelInfo.rank}`}
                />
              )}
              <h2 className="text-2xl font-medium tracking-tight text-[var(--text-primary)] sm:text-3xl">
                {greeting}, {user?.name ?? "Learner"}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs italic text-[var(--text-secondary)]">
              <span>“{quotes[quoteIdx % quotes.length]}”</span>
              <button
                type="button"
                onClick={() => setQuoteIdx((i) => i + 1)}
                className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                title="Đổi câu trích dẫn"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={addCustomQuote}
                className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                title="Thêm câu trích dẫn riêng của bạn"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <div className="pt-1">
              <div className="flex max-w-md items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>XP Level {levelInfo.level + 1}</span>
                <span className="font-mono tabular-nums">
                  {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
                </span>
              </div>
              <div className="mt-1.5 h-2 max-w-md overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="accent-gradient progress-sheen h-full rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onJumpFocus()}
              className="btn-primary inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium"
            >
              <Play className="h-4 w-4 fill-current" />
              {lang === "vi" ? "Vào phiên tập trung" : "Start Focus"}
            </button>
            <button
              type="button"
              disabled={isTodayFrozen || (user?.streakFreezes ?? 0) <= 0}
              onClick={handleUseFreeze}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs font-medium text-sky-600 dark:text-sky-400 disabled:opacity-50"
            >
              <Snowflake className="h-4 w-4" />
              {isTodayFrozen ? "Đã đóng băng" : `Freeze (${user?.streakFreezes ?? 0})`}
            </button>
          </div>
        </div>
      </section>

      {/* THANH TIỆN ÍCH NHANH (Tách riêng để giữ Hero luôn thoáng và cân đối) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={kickoffBusy}
            onClick={handleMorningKickoff}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:opacity-90"
          >
            <Sunrise className="h-3.5 w-3.5" />
            {kickoffBusy ? "Đang dọn lịch..." : "Khởi động ngày mới"}
          </button>
          {lastContextTab && onResumeTab && (
            <button
              type="button"
              onClick={() => onResumeTab(lastContextTab)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Học tiếp chỗ dở
            </button>
          )}
          {onOpenWeeklyReview && (
            <button
              type="button"
              onClick={onOpenWeeklyReview}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:opacity-90"
            >
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Tổng kết tuần
            </button>
          )}
          <button
            type="button"
            onClick={copyDailyStandup}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {copiedStandup ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedStandup ? "Đã chép tóm tắt" : "Chép tóm tắt ngày"}
          </button>
          <button
            type="button"
            onClick={copyTodayAgenda}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {copiedAgenda ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedAgenda ? "Đã chép lịch" : "Chép lịch hôm nay"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cycleCover}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Image className="h-3.5 w-3.5" /> Ảnh bìa
          </button>
          <button
            type="button"
            onClick={toggleCleanMode}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
              cleanMode
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
            )}
          >
            {cleanMode ? "Giao diện: Tối giản" : "Giao diện: Đầy đủ"}
          </button>
        </div>
      </div>

      {/* THANH TIẾN ĐỘ THÁNG & NĂM + GỢI Ý VIỆC NÊN LÀM NGAY */}
      {(() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthPct = Math.round((now.getDate() / daysInMonth) * 100);
        const startYear = new Date(now.getFullYear(), 0, 1).getTime();
        const endYear = new Date(now.getFullYear() + 1, 0, 1).getTime();
        const yearPct = Math.round(((now.getTime() - startYear) / (endYear - startYear)) * 100);

        const overdueCount = todos.filter(
          (t) => !t.isCompleted && t.dueDate && t.dueDate.slice(0, 10) < todayKey
        ).length;
        const dueCardsCount = flashcards.filter(
          (c) => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= nowMs
        ).length;
        const nearExam = exams.find((e) => {
          const d = Math.ceil((new Date(e.examDate).getTime() - nowMs) / 86400000);
          return d >= 0 && d <= 7;
        });

        const nextRec = nearExam
          ? {
              msg: `Kỳ thi "${nearExam.title}" sắp diễn ra trong vòng 7 ngày tới — hãy tập trung ôn ngay.`,
              cta: "Vào phiên ôn thi",
              action: () => onJumpFocus(`Ôn thi ${nearExam.title}`),
            }
          : overdueCount > 0
          ? {
              msg: `Bạn đang có ${overdueCount} việc trễ hạn cần xử lý dứt điểm trước khi mở việc mới.`,
              cta: "Tập trung xử lý",
              action: () => onJumpFocus("Xử lý công việc trễ hạn"),
            }
          : dueCardsCount > 0
          ? {
              msg: `Có ${dueCardsCount} thẻ Flashcard đang đến hạn ôn lặp lại ngắt quãng (SM-2).`,
              cta: "Bắt đầu phiên ôn 25p",
              action: () => onJumpFocus("Ôn tập Flashcards đến hạn"),
            }
          : {
              msg: `Hôm nay bạn đã đạt ${goalPct}% mục tiêu tập trung (${todayMinutes}/${dailyGoal} phút).`,
              cta: "Vào phiên Pomodoro",
              action: () => onJumpFocus(),
            };

        return (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs lg:col-span-7">
              <div className="flex items-center gap-2.5 min-w-0">
                <Compass className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span className="text-[var(--text-primary)]">
                  <strong>Nên làm ngay:</strong> {nextRec.msg}
                </span>
              </div>
              <button
                type="button"
                onClick={nextRec.action}
                className="btn-primary shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-medium"
              >
                {nextRec.cta}
              </button>
            </div>
            <div className="glass-card flex flex-col justify-center gap-1.5 rounded-2xl px-4 py-3 text-[11px] lg:col-span-5">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>Tiến độ Tháng {now.getMonth() + 1}: <strong>{monthPct}%</strong></span>
                <span>Năm {now.getFullYear()}: <strong>{yearPct}%</strong></span>
                <label className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  Hết HK:
                  <input
                    type="date"
                    value={semEndDate}
                    onChange={(e) => {
                      setSemEndDate(e.target.value);
                      localStorage.setItem("kronoflow-sem-end", e.target.value);
                    }}
                    className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1 py-0.5 font-mono text-[10px]"
                  />
                  {semEndDate && (
                    <strong className="font-mono text-[var(--accent)]">
                      ({Math.max(0, Math.ceil((new Date(semEndDate).getTime() - nowMs) / 86400000))}d)
                    </strong>
                  )}
                </label>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${monthPct}%` }} />
              </div>
            </div>
          </div>
        );
      })()}

      {!cleanMode && flashcards.length > 0 && (() => {
        const daySeed = new Date().getDate() + new Date().getMonth() * 31;
        const card = flashcards[daySeed % flashcards.length];
        if (!card) return null;
        return (
          <section className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                Ôn nhanh 10 giây hôm nay (Daily Recall)
              </div>
              <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {recallFlipped ? `Đáp án: ${card.back}` : card.front}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRecallFlipped((f) => !f)}
              className="shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
            >
              {recallFlipped ? "Xem câu hỏi" : "Lật đáp án"}
            </button>
          </section>
        );
      })()}

      <ReverseExamPlannerModal
        open={reverseOpen}
        exams={exams}
        onClose={() => setReverseOpen(false)}
        onRefresh={onRefresh}
      />

      {/* THANH NHẮC TIẾT HỌC SẮP TỚI TRONG 60 PHÚT */}
      {!cleanMode && slots.length > 0 && (() => {
        const now = new Date();
        const jsDay = now.getDay(); // 0=Sun..6=Sat
        const curMins = now.getHours() * 60 + now.getMinutes();
        const parseHm = (hm: string) => {
          const [h, m] = hm.split(":").map(Number);
          return (h ?? 0) * 60 + (m ?? 0);
        };
        const upcoming = slots
          .filter((sl) => sl.dayOfWeek === jsDay || (jsDay === 0 && sl.dayOfWeek === 7))
          .map((sl) => ({ sl, diff: parseHm(sl.startTime) - curMins, endDiff: parseHm(sl.endTime) - curMins }))
          .filter((x) => x.diff <= 60 && x.endDiff > 0)
          .sort((a, b) => a.diff - b.diff)[0];
        if (!upcoming) return null;
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-500/35 bg-sky-500/10 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-medium text-sky-700 dark:text-sky-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
              <span>
                {upcoming.diff <= 0 ? "Đang diễn ra:" : `Tiết học sắp tới (còn ${upcoming.diff} phút):`}{" "}
                <strong>{upcoming.sl.title}</strong>
              </span>
            </div>
            <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
              {upcoming.sl.startTime}–{upcoming.sl.endTime}
              {upcoming.sl.location ? ` · Phòng ${upcoming.sl.location}` : ""}
            </div>
          </div>
        );
      })()}

      {/* THẺ ƯU TIÊN LÀM TRƯỚC HÔM NAY */}
      {!cleanMode && (() => {
        const prioOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const topTasks = todos
          .filter((t) => !t.isCompleted)
          .sort((a, b) => {
            const pa = prioOrder[a.priority] ?? 2;
            const pb = prioOrder[b.priority] ?? 2;
            if (pa !== pb) return pa - pb;
            return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
          })
          .slice(0, 3);
        const nextEx = [...exams]
          .filter((ex) => new Date(ex.examDate).getTime() >= Date.now() - 86400000)
          .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];
        if (topTasks.length === 0 && !nextEx) return null;
        return (
          <div className="glass-card rounded-2xl px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                Ưu tiên làm trước hôm nay
              </span>
              {nextEx && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Kỳ thi gần nhất: {nextEx.title} (còn{" "}
                  {Math.max(0, Math.ceil((new Date(nextEx.examDate).getTime() - Date.now()) / 86400000))} ngày)
                </span>
              )}
            </div>
            {topTasks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {topTasks.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-[11px] text-[var(--text-primary)]"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        t.priority === "high" ? "bg-rose-500" : t.priority === "medium" ? "bg-amber-500" : "bg-sky-500"
                      }`}
                    />
                    <span className="max-w-[200px] truncate">{t.title}</span>
                    {t.dueDate && (
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {t.dueDate.slice(5, 10)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* THANH CÂN BẰNG THỜI GIAN THEO MÔN HỌC */}
      {!cleanMode && subjects.length > 0 && (() => {
        const subMins = subjects
          .map((sub) => ({
            id: sub.id,
            name: sub.name,
            color: sub.color,
            mins: sessions
              .filter((s) => s.status === "completed" && s.subjectId === sub.id)
              .reduce((a, b) => a + b.actualMinutes, 0),
          }))
          .filter((x) => x.mins > 0)
          .sort((a, b) => b.mins - a.mins)
          .slice(0, 4);
        const tot = subMins.reduce((a, b) => a + b.mins, 0);
        if (tot === 0) return null;
        return (
          <div className="glass-card rounded-2xl px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
              <span>Cân bằng thời gian theo môn:</span>
              <div className="flex flex-wrap gap-2.5">
                {subMins.map((sm) => (
                  <span key={sm.id} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sm.color }} />
                    {sm.name} ({Math.round((sm.mins / tot) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              {subMins.map((sm) => (
                <div
                  key={sm.id}
                  style={{ width: `${(sm.mins / tot) * 100}%`, backgroundColor: sm.color }}
                  title={`${sm.name}: ${(sm.mins / 60).toFixed(1)}h`}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* MỐC THÀNH TÍCH TIẾP THEO (NEXT MILESTONE CARD) */}
      {!cleanMode && (() => {
        const totalHrs = +(
          sessions.filter((s) => s.status === "completed").reduce((a, b) => a + b.actualMinutes, 0) / 60
        ).toFixed(1);
        const targets = [5, 10, 25, 50, 100, 250, 500];
        const nextHrs = targets.find((h) => h > totalHrs) ?? Math.ceil((totalHrs + 50) / 50) * 50;
        const hrsPct = Math.min(100, Math.round((totalHrs / nextHrs) * 100));
        const nextStreak = [3, 7, 14, 30, 60, 100].find((d) => d > streak) ?? streak + 30;
        return (
          <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-[var(--text-secondary)]">
                Mốc sắp chạm: <strong className="text-[var(--text-primary)]">{nextHrs} giờ học</strong>{" "}
                (đã đạt {totalHrs}h · còn {Math.max(0, +(nextHrs - totalHrs).toFixed(1))}h) · Chuỗi tiếp theo:{" "}
                <strong className="text-[var(--accent)]">{nextStreak} ngày</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${hrsPct}%` }} />
              </div>
              <span className="font-mono text-[11px] font-semibold text-amber-600">{hrsPct}%</span>
            </div>
          </div>
        );
      })()}

      {/* LỊCH TUẦN THU GỌN (MINI WEEK STRIP) + GỢI Ý MỤC TIÊU NGÀY */}
      {!cleanMode && (() => {
        const now = new Date();
        const dow = now.getDay() === 0 ? 7 : now.getDay();
        const mondayMs = now.getTime() - (dow - 1) * 86400000;
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(mondayMs + i * 86400000);
          const iso = d.toISOString().slice(0, 10);
          const studied = (dayMap.get(iso) ?? 0) > 0;
          const hasExam = exams.some((e) => e.examDate.slice(0, 10) === iso);
          const hasDue = todos.some((t) => !t.isCompleted && t.dueDate?.slice(0, 10) === iso);
          return {
            iso,
            label: i === 6 ? "CN" : `T${i + 2}`,
            dayNum: d.getDate(),
            isToday: iso === todayKey,
            studied,
            hasExam,
            hasDue,
          };
        });
        const avg7 = Math.round(
          Array.from({ length: 7 }, (_, i) => {
            const iso = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            return dayMap.get(iso) ?? 0;
          }).reduce((a, b) => a + b, 0) / 7
        );
        return (
          <section className="glass-card rounded-2xl px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="grid flex-1 grid-cols-7 gap-1.5">
                {weekDays.map((wd) => (
                  <div
                    key={wd.iso}
                    className={cn(
                      "flex flex-col items-center rounded-xl border py-1.5",
                      wd.isToday
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                        : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                    )}
                  >
                    <span className="text-[10px] opacity-80">{wd.label}</span>
                    <span className="font-mono text-xs">{wd.dayNum}</span>
                    <div className="mt-1 flex gap-0.5">
                      {wd.studied && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Đã học" />}
                      {wd.hasExam && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Kỳ thi" />}
                      {wd.hasDue && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Việc đến hạn" />}
                    </div>
                  </div>
                ))}
              </div>
              {avg7 > 0 && dailyGoal > avg7 * 1.6 && (
                <div className="max-w-xs text-[11px] text-amber-600 dark:text-amber-400">
                  💡 TB 7 ngày của bạn là {avg7}p/ngày — có thể hạ nhẹ mục tiêu ({dailyGoal}p) xuống ~{Math.max(30, Math.round((avg7 + 20) / 10) * 10)}p để dễ giữ chuỗi hơn.
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {nextClassToday && (
        <section className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border-l-[var(--accent)] px-5 py-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <div>
              <span className="font-semibold text-[var(--text-primary)]">
                Tiết học tiếp theo hôm nay: {nextClassToday.title}
              </span>
              <span className="ml-2 font-mono text-[var(--accent)]">
                {nextClassToday.startTime}–{nextClassToday.endTime}
              </span>
              {nextClassToday.location && (
                <span className="ml-2 text-[var(--text-muted)]">· Phòng {nextClassToday.location}</span>
              )}
            </div>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--accent)]">
            {nextClassToday.diffM <= 0
              ? "Đang diễn ra"
              : nextClassToday.diffM < 60
              ? `Còn ${nextClassToday.diffM} phút`
              : `Còn ${Math.floor(nextClassToday.diffM / 60)}h ${nextClassToday.diffM % 60}p`}
          </span>
        </section>
      )}

      {pinnedVault.length > 0 && (
        <section className="glass-card rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            <Pin className="h-3.5 w-3.5 text-amber-500" />
            Tài liệu đã ghim từ Kho
          </div>
          <div className="flex flex-wrap gap-2">
            {pinnedVault.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {r.title}
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* LIVE EXAM SPOTLIGHT COUNTDOWN */}
      {upcomingExam && (
        <section className="glass-card card-lift flex flex-wrap items-center justify-between gap-4 border-amber-500/30 p-5">
          <div>
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
              {lang === "vi" ? "Sự kiện sắp tới gần nhất" : "Next Big Milestone"}
            </span>
            <h3 className="mt-1 text-base font-medium text-[var(--text-primary)]">
              {upcomingExam.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono">
            {[
              { val: spDays, lbl: lang === "vi" ? "Ngày" : "D" },
              { val: spHours, lbl: lang === "vi" ? "Giờ" : "H" },
              { val: spMins, lbl: lang === "vi" ? "Phút" : "M" },
              { val: spSecs, lbl: lang === "vi" ? "Giây" : "S" },
            ].map((b) => (
              <div
                key={b.lbl}
                className="flex min-w-[52px] flex-col items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              >
                <span className="text-base font-bold tabular-nums text-[var(--accent)]">
                  {String(b.val).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{b.lbl}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TÙY CHỈNH BỐ CỤC DASHBOARD */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowCust((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Tùy chỉnh Dashboard
        </button>
        {showCust && (
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {(
              [
                ["kpi", "4 KPI"],
                ["calendar", "Lịch"],
                ["hydration", "Uống nước"],
                ["sleep", "Giấc ngủ 90'"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleWidget(k)}
                className={
                  widgets[k]
                    ? "rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-medium text-[var(--accent)]"
                    : "rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-[var(--text-muted)]"
                }
              >
                {widgets[k] ? "✓ " : "+ "}
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4 KPI CARDS */}
      {widgets.kpi && <div className="stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card card-lift p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{lang === "vi" ? "Hôm nay / Mục tiêu" : "Today / Goal"}</span>
            <Target className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {todayMinutes}p
              </span>
              <span className="text-xs text-[var(--text-muted)]">/ {dailyGoal}p</span>
            </div>
            <button
              type="button"
              onClick={() => setEditingGoal((v) => !v)}
              className="rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {editingGoal ? "Đóng" : "Chỉnh"}
            </button>
          </div>
          {editingGoal && (
            <div className="mt-2 flex flex-wrap gap-1">
              {[60, 90, 120, 180, 240].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => quickUpdateGoal(m)}
                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${
                    dailyGoal === m
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                  }`}
                >
                  {m}p
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div className="accent-gradient progress-sheen h-full rounded-full" style={{ width: `${goalPct}%` }} />
          </div>
        </div>

        <div className="glass-card card-lift p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{lang === "vi" ? "Chuỗi kỷ luật" : "Study Streak"}</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {streak} {lang === "vi" ? "ngày" : "days"}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Còn <strong className="text-sky-500">{user?.streakFreezes ?? 0}</strong> Streak Freeze
          </p>
        
              <div className="mt-2.5 flex items-center gap-[3px]" title="30 ngày gần nhất (Xanh: Đã học · Xanh dương: Freeze)">
                {Array.from({ length: 30 }, (_, i) => {
                  const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
                  const studied = (dayMap.get(d) ?? 0) > 0;
                  const frozen = frozenDates.includes(d);
                  return (
                    <span
                      key={d}
                      title={`${d}: ${studied ? `${dayMap.get(d) ?? 0} phút` : frozen ? "Freeze" : "Nghỉ"}`}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        studied ? "bg-emerald-500" : frozen ? "bg-sky-400" : "bg-[var(--bg-elevated)]"
                      )}
                    />
                  );
                })}
              </div></div>

        <div className="glass-card card-lift p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{lang === "vi" ? "Tiến độ Lộ trình" : "Roadmap Progress"}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {roadmapPct}%
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            {doneRoadmapItems} / {allRoadmapItems.length} chặng
          </p>
        </div>

        <div className="glass-card card-lift p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Flashcards</span>
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {masteredCards} / {flashcards.length}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">Mức thuộc ≥ 4/5</p>
        </div>
      </div>}

      {/* SMART ZOOMABLE CALENDAR + EXAMS & PRIORITY TASKS */}
      <div className="grid gap-6 lg:grid-cols-12">
        {widgets.calendar && <div className="lg:col-span-7">
          <SmartCalendar
            subjects={subjects}
            sessions={sessions}
            exams={exams}
            timeBlocks={timeBlocks}
            frozenDates={frozenDates}
            onRefresh={onRefresh}
          />
        </div>}

        <div className="space-y-6 lg:col-span-5">
          <section className="glass-card card-lift p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Đếm ngược Kỳ thi & Deadline
                </h3>
              </div>
              {exams.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const c = document.createElement("canvas");
                    c.width = 1080;
                    c.height = 600;
                    const ctx = c.getContext("2d");
                    if (!ctx) return;
                    const g = ctx.createLinearGradient(0, 0, 1080, 600);
                    g.addColorStop(0, "#0f172a");
                    g.addColorStop(1, "#1e293b");
                    ctx.fillStyle = g;
                    ctx.fillRect(0, 0, 1080, 600);
                    ctx.fillStyle = "#38bdf8";
                    ctx.font = "bold 24px sans-serif";
                    ctx.fillText("KRONOFLOW · EXAM COUNTDOWN WALL", 64, 82);
                    ctx.fillStyle = "#f8fafc";
                    ctx.font = "bold 46px sans-serif";
                    const topEx = exams[0];
                    if (!topEx) return;
                    const dLeft = Math.max(0, Math.ceil((new Date(topEx.examDate).getTime() - Date.now()) / 86400000));
                    ctx.fillText(topEx.title.slice(0, 32), 64, 175);
                    ctx.fillStyle = "#fbbf24";
                    ctx.font = "bold 120px monospace";
                    ctx.fillText(`Còn ${dLeft} ngày`, 64, 330);
                    ctx.fillStyle = "#94a3b8";
                    ctx.font = "24px sans-serif";
                    ctx.fillText(`Ngày thi: ${topEx.examDate.slice(0, 10)} · Học viên: ${user?.name ?? "KronoFlow"}`, 64, 410);
                    ctx.fillStyle = "#38bdf8";
                    ctx.fillText("Giữ vững nhịp Pomodoro mỗi ngày!", 64, 520);
                    const a = document.createElement("a");
                    a.href = c.toDataURL("image/png");
                    a.download = "kronoflow-exam-countdown.png";
                    a.click();
                  }}
                  title="Tải ảnh đếm ngược kỳ thi (PNG)"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Download className="h-3 w-3" /> Tải ảnh
                </button>
              )}
              {exams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setReverseOpen(true)}
                  title="Tự động chia lịch ôn ngược từ ngày thi"
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]"
                >
                  <CalendarRange className="h-3 w-3" /> Chia lịch ôn
                </button>
              )}
              {exams.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const lines = [
                      "📅 Lịch thi sắp tới:",
                      ...exams.map((ex) => {
                        const d = Math.ceil((new Date(ex.examDate).getTime() - Date.now()) / 86400000);
                        return `• ${ex.title} — ${ex.examDate.slice(0, 10)} (${d >= 0 ? `còn ${d} ngày` : "đã qua"})`;
                      }),
                    ];
                    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
                    kfNotify("Đã sao chép danh sách Lịch thi để gửi nhóm học!");
                  }}
                  title="Sao chép lịch thi gửi nhóm học"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Copy className="h-3 w-3" /> Chép lịch
                </button>
              )}
            </div>
            <form onSubmit={handleAddExam} className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="VD: Thi cuối kỳ..."
                className="min-w-[120px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              />
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1.5 text-xs"
              />
              <button type="submit" className="btn-primary rounded-xl px-3 py-1.5 text-xs font-medium">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
            <ul className="mt-3.5 space-y-2">
              {exams.some((e) => new Date(e.examDate).getTime() < nowMs) && (
                <button
                  type="button"
                  onClick={() => setHidePastExams((v) => !v)}
                  className="text-[11px] text-[var(--accent)] hover:underline"
                >
                  {hidePastExams ? "Hiện lại kỳ thi đã qua" : "Ẩn gọn các kỳ thi đã qua"}
                </button>
              )}
              {exams
                .filter((e) => !hidePastExams || new Date(e.examDate).getTime() >= nowMs - 86400000)
                .map((ex) => {
                const prepDone = (examChecks[ex.id] ?? []).length;
                const readiness = Math.min(100, Math.round((prepDone / EXAM_PREP_STEPS.length) * 100));
                const diffDays = Math.ceil(
                  (new Date(ex.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <li
                    key={ex.id}
                    className={cn(
                      "rounded-xl border bg-[var(--bg-canvas)] px-3 py-2 text-xs transition-colors",
                      diffDays >= 0 && diffDays <= 3
                        ? "border-rose-500/60 bg-rose-500/5"
                        : diffDays > 3 && diffDays <= 14
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-[var(--border-subtle)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--text-primary)]">{ex.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        <span>{new Date(ex.examDate).toLocaleDateString("vi-VN")}</span>
                        {readiness > 0 && (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            Sẵn sàng {readiness}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        {diffDays >= 0 ? `Còn ${diffDays}d` : "Qua"}
                      </span>
                      {diffDays < 0 && (
                        <button
                          type="button"
                          onClick={() => handleExamToGpa(ex)}
                          title="Nhập điểm thi vào Sổ điểm GPA"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          <GraduationCap className="h-3 w-3" /> Lưu GPA
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(ex.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenExamCheckId((cur) => (cur === ex.id ? null : ex.id))}
                        title="Checklist chuẩn bị thi"
                        className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    </div>
                    {openExamCheckId === ex.id && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-2">
                        {EXAM_PREP_STEPS.map((st) => {
                          const checked = (examChecks[ex.id] ?? []).includes(st);
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => toggleExamStep(ex.id, st)}
                              className={cn(
                                "rounded-lg border px-2 py-0.5 text-[10px]",
                                checked
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 line-through"
                                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                              )}
                            >
                              {checked ? "✓ " : ""}{st}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {widgets.hydration && <section className="glass-card card-lift p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {lang === "vi" ? "Uống đủ nước hôm nay" : "Daily Hydration"}
                </h3>
              </div>
              <span className="font-mono text-xs font-semibold text-sky-500">
                {waterCups} / 8 ly
              </span>
            </div>
            <div className="mt-3 grid grid-cols-8 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((cup) => (
                <button
                  key={cup}
                  type="button"
                  onClick={() => updateWater(cup)}
                  title={`${cup} ly`}
                  className={
                    cup <= waterCups
                      ? "animate-pop flex h-9 items-center justify-center rounded-xl bg-sky-500 text-xs font-semibold text-white shadow-sm"
                      : "flex h-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs text-[var(--text-muted)] hover:border-sky-400"
                  }
                >
                  {cup}
                </button>
              ))}
            </div>
          </section>}

          {widgets.sleep && (
            <section className="glass-card card-lift p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">
                    Chu kỳ Giấc ngủ 90 phút
                  </h3>
                </div>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  title="Giờ muốn thức dậy"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 font-mono text-xs"
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Giờ đi ngủ tối ưu (đã trừ 15p vào giấc) để dậy tỉnh táo lúc {wakeTime}:
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {sleepOptions.map((opt) => (
                  <div
                    key={opt.cycles}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-center"
                  >
                    <div className="font-mono text-sm font-bold text-[var(--accent)]">
                      {opt.time}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {opt.cycles} chu kỳ ({opt.hours}h)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NHIỆM VỤ NGÀY MỚI + GHI CHÚ ĐÃ GHIM */}
          <section className="glass-card card-lift p-5">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              {lang === "vi" ? "Nhiệm vụ ngày mới (Daily Quests)" : "Daily Quests"}
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              {dailyQuests.map((q) => (
                <li
                  key={q.label}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                >
                  <span className={q.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}>
                    {q.label}
                  </span>
                  <span className={q.done ? "font-semibold text-emerald-500" : "text-[var(--text-muted)]"}>
                    {q.done ? "✓ Xong" : "+25 XP"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {pinnedNotes.length > 0 && (
            <section className="glass-card card-lift p-5">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                {lang === "vi" ? "Ghi chú đã ghim" : "Pinned Notes"}
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                {pinnedNotes.map((pn) => (
                  <li
                    key={pn.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">{pn.title}</div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">
                      {pn.content}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="glass-card card-lift p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Việc ưu tiên ({pendingTodos.length})
              </h3>
              {pendingTodos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const pick = pendingTodos[Math.floor(Math.random() * pendingTodos.length)];
                    if (pick) onJumpFocus(pick.title);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]"
                >
                  <Dices className="h-3.5 w-3.5" />
                  Chọn giúp 1 việc
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {pendingTodos.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                >
                  <span className="truncate text-[var(--text-primary)]">{t.title}</span>
                  <button
                    type="button"
                    onClick={() => onJumpFocus(t.title)}
                    className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-medium text-[var(--accent)]"
                  >
                    Học ngay
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {!cleanMode && (sessions.length > 0 || todos.length > 0 || notes.length > 0) && (
        <section className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <History className="h-4 w-4 text-[var(--accent)]" />
              Hoạt động gần đây (Recent Activity)
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {(
                [
                  ["all", "Tất cả"],
                  ["sessions", "Chỉ phiên học"],
                  ["todos", "Chỉ việc xong"],
                ] as const
              ).map(([k, lb]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActivityFilter(k)}
                  className={cn(
                    "rounded-lg px-2 py-0.5 font-medium",
                    activityFilter === k
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                  )}
                >
                  {lb}
                </button>
              ))}
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecentSessions}
                  title="Xóa toàn bộ lịch sử phiên học"
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-500 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3 w-3" /> Xóa lịch sử phiên
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {activityFilter !== "todos" &&
              sessions.slice(0, 8).map((s) => (
                <div
                  key={`act-s-${s.id}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)]">
                      ⏱ Phiên {s.actualMinutes} phút
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                      {s.notes || "Tập trung sâu"} · {s.startedAt.slice(0, 10)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecentSession(s.id)}
                    title="Xóa phiên này khỏi lịch sử"
                    className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            {activityFilter !== "sessions" &&
              todos
                .filter((t) => t.isCompleted)
                .slice(0, 4)
                .map((t) => (
                  <div
                    key={`act-t-${t.id}`}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                  >
                    <div className="truncate font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ {t.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">Đã hoàn thành</div>
                  </div>
                ))}
          </div>
        </section>
      )}
    </div>
  );
}
