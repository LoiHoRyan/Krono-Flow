"use client";

import { useEffect, useState } from "react";
import {
  Flame,
  Snowflake,
  Play,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Trophy,
  Target,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeLevelInfo } from "@/lib/themes";
import { useLang } from "@/lib/i18n";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import type { RoadmapRecord } from "./RoadmapPanel";
import type { FlashcardRecord } from "./NotesFlashcardsPanel";
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
  onJumpFocus: (taskTitle?: string) => void;
  onRefresh: () => void;
}) {
  const { lang } = useLang();
  const [nowClock, setNowClock] = useState("");
  const [quoteIdx, setQuoteIdx] = useState(0);

  const todayObj = new Date();
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth()); // 0..11
  const [selectedDay, setSelectedDay] = useState(() => todayObj.toISOString().slice(0, 10));

  // Thêm nhanh sự kiện/block ngay trên ngày đang chọn của Lịch
  const [quickBlockTitle, setQuickBlockTitle] = useState("");
  const [quickStart, setQuickStart] = useState("19:30");
  const [quickEnd, setQuickEnd] = useState("21:00");

  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    const tick = () => {
      setNowClock(
        new Date().toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lang]);

  const hour = new Date().getHours();
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

  const handleQuickAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBlockTitle.trim()) return;
    const res = await fetch("/api/timeblocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockDate: selectedDay,
        startTime: quickStart,
        endTime: quickEnd,
        title: quickBlockTitle.trim(),
      }),
    });
    if (res.ok) {
      setQuickBlockTitle("");
      onRefresh();
    }
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

  const stepMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  const jumpToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDay(now.toISOString().slice(0, 10));
  };

  const allRoadmapItems = roadmaps.flatMap((r) => r.items);
  const doneRoadmapItems = allRoadmapItems.filter((i) => i.status === "done").length;
  const roadmapPct =
    allRoadmapItems.length > 0 ? Math.round((doneRoadmapItems / allRoadmapItems.length) * 100) : 0;

  const firstWeekday = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push(`${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const selectedDaySessions = completedSessions.filter(
    (s) => new Date(s.startedAt).toISOString().slice(0, 10) === selectedDay
  );
  const selectedDayBlocks = timeBlocks.filter((b) => b.blockDate === selectedDay);
  const pendingTodos = todos.filter((t) => !t.isCompleted).slice(0, 5);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const quotes = lang === "vi" ? QUOTES_VI : QUOTES_EN;
  const years = Array.from({ length: 11 }, (_, i) => 2022 + i);

  return (
    <div className="space-y-6">
      {/* LIVE HERO BRIEF */}
      <section className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-7">
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Cấp {levelInfo.level} · {levelInfo.rank} ({levelInfo.xp} XP)
              </span>
              {nowClock && (
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1 font-mono text-xs text-[var(--accent)]">
                  {nowClock}
                </span>
              )}
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
              {lang === "vi" ? "Vào phiên tập trung" : "Start Focus Session"}
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

      {/* 4 KPI CARDS */}
      <div className="stagger-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card card-lift rounded-2xl p-5">
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

        <div className="glass-card card-lift rounded-2xl p-5">
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

        <div className="glass-card card-lift rounded-2xl p-5">
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

        <div className="glass-card card-lift rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Flashcards</span>
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {masteredCards} / {flashcards.length}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">Mức thuộc ≥ 4/5</p>
        </div>
      </div>

      {/* FULL INTERACTIVE CALENDAR + EXAM COUNTDOWN */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[var(--accent)]" />
              <select
                value={calMonth}
                onChange={(e) => setCalMonth(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] outline-none"
              >
                {Array.from({ length: 12 }, (_, m) => (
                  <option key={m} value={m}>
                    {lang === "vi" ? `Tháng ${m + 1}` : `Month ${m + 1}`}
                  </option>
                ))}
              </select>
              <select
                value={calYear}
                onChange={(e) => setCalYear(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 font-mono text-xs font-medium text-[var(--text-primary)] outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={jumpToday}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
              >
                {lang === "vi" ? "Hôm nay" : "Today"}
              </button>
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => stepMonth(1)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-muted)]">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
            {calCells.map((iso, idx) => {
              if (!iso) return <div key={`empty-${idx}`} />;
              const mins = dayMap.get(iso) ?? 0;
              const frozen = frozenDates.includes(iso);
              const hasBlocks = timeBlocks.some((b) => b.blockDate === iso);
              const isSelected = iso === selectedDay;
              const isToday = iso === todayKey;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDay(iso)}
                  className={cn(
                    "relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs",
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : mins > 0
                      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                      : isToday
                      ? "border-[var(--accent)]/40 bg-[var(--bg-elevated)] font-semibold text-[var(--text-primary)]"
                      : "border-transparent bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]"
                  )}
                >
                  <span>{Number(iso.slice(8))}</span>
                  <div className="flex items-center gap-0.5">
                    {mins > 0 && <span className="font-mono text-[9px]">{mins}p</span>}
                    {hasBlocks && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                    {frozen && mins === 0 && <Snowflake className="h-2.5 w-2.5 text-sky-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chi tiết ngày đang chọn + Thêm lịch nhanh ngay tại ngày đó */}
          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                {lang === "vi" ? "Lịch & Nhật ký ngày" : "Schedule for"} {selectedDay}
              </span>
              <span className="font-mono text-[var(--accent)]">
                {dayMap.get(selectedDay) ?? 0}p · {selectedDayBlocks.length} lịch hẹn
              </span>
            </div>

            {(selectedDayBlocks.length > 0 || selectedDaySessions.length > 0) && (
              <ul className="mt-2.5 space-y-1.5">
                {selectedDayBlocks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-primary)]">• {b.title}</span>
                    <span className="font-mono text-[11px] text-[var(--accent)]">
                      {b.startTime}–{b.endTime}
                    </span>
                  </li>
                ))}
                {selectedDaySessions.map((s) => {
                  const sub = s.subjectId ? subjectMap.get(s.subjectId) : undefined;
                  return (
                    <li key={s.id} className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span className="truncate">✓ {s.notes || sub?.name || s.mode}</span>
                      <span className="font-mono">{s.actualMinutes}p</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={handleQuickAddBlock} className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-3">
              <input
                type="time"
                value={quickStart}
                onChange={(e) => setQuickStart(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px]"
              />
              <input
                type="time"
                value={quickEnd}
                onChange={(e) => setQuickEnd(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px]"
              />
              <input
                type="text"
                value={quickBlockTitle}
                onChange={(e) => setQuickBlockTitle(e.target.value)}
                placeholder={`Thêm nhanh lịch học cho ${selectedDay}...`}
                className="min-w-[140px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium"
              >
                <Plus className="h-3 w-3" />
                Thêm
              </button>
            </form>
          </div>
        </section>

        <div className="space-y-6 lg:col-span-5">
          <section className="glass-card card-lift rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
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

          <section className="glass-card card-lift rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Việc ưu tiên ({pendingTodos.length})
            </h3>
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
