"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeLevelInfo } from "@/lib/themes";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import type { RoadmapRecord } from "./RoadmapPanel";
import type { FlashcardRecord } from "./NotesFlashcardsPanel";

export interface UserProfile {
  id: string;
  name: string;
  bio: string;
  dailyGoalMinutes: number;
  streakFreezes: number;
  frozenDates: string;
  theme: string;
  wallpaper: string;
}

export interface ExamRecord {
  id: string;
  title: string;
  examDate: string;
  color: string;
}

export function DashboardBento({
  user,
  subjects,
  sessions,
  todos,
  roadmaps,
  flashcards,
  exams,
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
  onJumpFocus: (taskTitle?: string) => void;
  onRefresh: () => void;
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");

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

  // Tính chuỗi ngày liên tiếp có tính cả ngày Freeze
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

  // Tính tiến độ lộ trình tổng thể
  const allRoadmapItems = roadmaps.flatMap((r) => r.items);
  const doneRoadmapItems = allRoadmapItems.filter((i) => i.status === "done").length;
  const roadmapPct =
    allRoadmapItems.length > 0
      ? Math.round((doneRoadmapItems / allRoadmapItems.length) * 100)
      : 0;

  // Build lịch tháng
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calCells.push(iso);
  }

  const selectedDaySessions = completedSessions.filter(
    (s) => new Date(s.startedAt).toISOString().slice(0, 10) === selectedDay
  );
  const pendingTodos = todos.filter((t) => !t.isCompleted).slice(0, 5);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      {/* HERO PROFILE & GAMIFICATION BANNER */}
      <section className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-7">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
        />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[var(--text-primary)]">
                Cấp {levelInfo.level} · {levelInfo.rank}
              </span>
              <span className="font-mono text-[var(--accent)]">{levelInfo.xp} XP</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Xin chào, {user?.name ?? "KronoFlow Learner"}
            </h2>
            <p className="max-w-xl text-sm text-[var(--text-secondary)]">
              {user?.bio ?? "Tập trung mỗi ngày — Xây dựng kỷ luật bền vững"}
            </p>
            <div className="pt-1">
              <div className="flex max-w-md items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Tiến độ lên Cấp {levelInfo.level + 1}</span>
                <span className="font-mono tabular-nums">
                  {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
                </span>
              </div>
              <div className="mt-1.5 h-2 max-w-md overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="accent-gradient h-full rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onJumpFocus()}
              className="accent-gradient inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
            >
              <Play className="h-4 w-4 fill-current" />
              Vào phiên tập trung ngay
            </button>

            <button
              type="button"
              disabled={isTodayFrozen || (user?.streakFreezes ?? 0) <= 0}
              onClick={handleUseFreeze}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-xs font-semibold text-sky-400 transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              <Snowflake className="h-4 w-4" />
              {isTodayFrozen
                ? "Hôm nay đã đóng băng"
                : `Đóng băng Streak (${user?.streakFreezes ?? 0})`}
            </button>
          </div>
        </div>
      </section>

      {/* 4 KPI BENTO CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Hôm nay / Mục tiêu</span>
            <Target className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
              {todayMinutes}p
            </span>
            <span className="text-xs text-[var(--text-muted)]">/ {dailyGoal}p</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div className="accent-gradient h-full rounded-full" style={{ width: `${goalPct}%` }} />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Chuỗi kỷ luật (Streak)</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {streak} ngày
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Còn <strong className="text-sky-400">{user?.streakFreezes ?? 0}</strong> thẻ Streak Freeze bảo vệ
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Tiến độ Lộ trình</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {roadmapPct}%
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            {doneRoadmapItems} / {allRoadmapItems.length} chặng đã hoàn thành
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Flashcards đã thuộc</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {masteredCards} / {flashcards.length}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Mức độ ghi nhớ từ 4/5 sao trở lên
          </p>
        </div>
      </div>

      {/* MAIN BENTO ROW: MONTHLY CALENDAR + EXAM COUNTDOWN + QUICK TASKS */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Lịch học tháng tương tác */}
        <section className="glass-card rounded-2xl p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Lịch học tháng {month + 1}/{year}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCalMonth(new Date(year, month - 1, 1))}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCalMonth(new Date(year, month + 1, 1))}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              const isSelected = iso === selectedDay;
              const dayNum = Number(iso.slice(8));
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDay(iso)}
                  className={cn(
                    "relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs transition",
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-bold text-[var(--text-primary)]"
                      : mins > 0
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                      : frozen
                      ? "border-sky-500/30 bg-sky-500/15 text-sky-400"
                      : "border-transparent bg-[var(--bg-elevated)]/60 text-[var(--text-secondary)] hover:border-[var(--border-subtle)]"
                  )}
                >
                  <span>{dayNum}</span>
                  {mins > 0 && <span className="font-mono text-[9px]">{mins}p</span>}
                  {frozen && mins === 0 && <Snowflake className="h-2.5 w-2.5 text-sky-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                Chi tiết ngày {selectedDay}
              </span>
              <span className="font-mono text-[var(--accent)]">
                {dayMap.get(selectedDay) ?? 0} phút
              </span>
            </div>
            {selectedDaySessions.length === 0 ? (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Chưa có phiên học nào được ghi nhận trong ngày này.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {selectedDaySessions.map((s) => {
                  const sub = s.subjectId ? subjectMap.get(s.subjectId) : undefined;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between text-xs text-[var(--text-secondary)]"
                    >
                      <span className="truncate">{s.notes || sub?.name || s.mode}</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {s.actualMinutes}p
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Đếm ngược kỳ thi + Công việc ưu tiên */}
        <div className="space-y-6 lg:col-span-5">
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Đếm ngược Kỳ thi & Deadline
              </h3>
            </div>

            <form onSubmit={handleAddExam} className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="VD: Thi cuối kỳ DSA..."
                className="min-w-[130px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
              />
              <button
                type="submit"
                className="accent-gradient inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm
              </button>
            </form>

            <ul className="mt-3.5 space-y-2">
              {exams.length === 0 ? (
                <li className="text-xs text-[var(--text-muted)]">
                  Thêm lịch thi hoặc deadline quan trọng để đếm ngược mỗi ngày.
                </li>
              ) : (
                exams.map((ex) => {
                  const diffDays = Math.ceil(
                    (new Date(ex.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <li
                      key={ex.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                          {ex.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {new Date(ex.examDate).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-lg px-2.5 py-1 font-mono text-xs font-bold",
                            diffDays <= 7
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-amber-500/15 text-amber-400"
                          )}
                        >
                          {diffDays >= 0 ? `Còn ${diffDays} ngày` : "Đã qua"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExam(ex.id)}
                          className="text-[var(--text-muted)] hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Việc cần làm ngay ({pendingTodos.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {pendingTodos.length === 0 ? (
                <li className="text-xs text-[var(--text-muted)]">
                  Tuyệt vời! Hiện chưa có công việc tồn đọng nào.
                </li>
              ) : (
                pendingTodos.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 py-2 text-xs"
                  >
                    <span className="truncate text-[var(--text-primary)]">{t.title}</span>
                    <button
                      type="button"
                      onClick={() => onJumpFocus(t.title)}
                      className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent)] hover:opacity-90"
                    >
                      Học ngay
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
