"use client";

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
} from "lucide-react";
import { computeLevelInfo } from "@/lib/themes";
import { useLang } from "@/lib/i18n";
import { SmartCalendar } from "./SmartCalendar";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import type { RoadmapRecord } from "./RoadmapPanel";
import type { FlashcardRecord, NoteRecord } from "./NotesFlashcardsPanel";
import type { TimeBlockRecord } from "./GoalsTimeblockPanel";

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
  onJumpFocus,
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
  onJumpFocus: (taskTitle?: string) => void;
  onRefresh: () => void;
}) {
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
  const quotes = lang === "vi" ? QUOTES_VI : QUOTES_EN;

  // Kỳ thi gần nhất cho Spotlight Countdown (Ngày : Giờ : Phút : Giây)
  const upcomingExam = exams.find((e) => new Date(e.examDate).getTime() > nowMs);
  const spotlightDiff = upcomingExam
    ? Math.max(0, Math.floor((new Date(upcomingExam.examDate).getTime() - nowMs) / 1000))
    : 0;
  const spDays = Math.floor(spotlightDiff / 86400);
  const spHours = Math.floor((spotlightDiff % 86400) / 3600);
  const spMins = Math.floor((spotlightDiff % 3600) / 60);
  const spSecs = spotlightDiff % 60;

  return (
    <div className="space-y-6">
      {/* LIVE HERO BRIEF */}
      <section className="glass-card relative overflow-hidden p-6 sm:p-7">
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Cấp {levelInfo.level} · {levelInfo.rank} ({levelInfo.xp} XP)
              </span>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1 font-mono text-xs text-[var(--accent)]">
                {nowClock}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-12 w-12 rounded-full border-2 border-[var(--accent)] object-cover"
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

          <div className="flex flex-wrap items-center gap-3">
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
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
              {todayMinutes}p
            </span>
            <span className="text-xs text-[var(--text-muted)]">/ {dailyGoal}p</span>
          </div>
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
        </div>

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
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Đếm ngược Kỳ thi & Deadline
              </h3>
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
              {exams.map((ex) => {
                const diffDays = Math.ceil(
                  (new Date(ex.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--text-primary)]">{ex.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {new Date(ex.examDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        {diffDays >= 0 ? `Còn ${diffDays}d` : "Qua"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(ex.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
    </div>
  );
}
