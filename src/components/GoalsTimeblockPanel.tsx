"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, Flag, Plus, Sparkles, Trash2,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { GroupProjectPanel } from "./GroupProjectPanel";

export interface GoalRecord {
  id: string;
  title: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string | null;
}

export interface TimeBlockRecord {
  id: string;
  blockDate: string;
  startTime: string;
  endTime: string;
  title: string;
  isDone: boolean;
  color: string;
}

export function GoalsTimeblockPanel({
  goals,
  timeBlocks,
  onNotify,
  onRefresh,
}: {
  goals: GoalRecord[];
  timeBlocks: TimeBlockRecord[];
  onNotify: (msg: string) => void;
  onRefresh: () => void;
}) {
  const { lang } = useLang();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tbView, setTbView] = useState<"grid" | "list">("grid");
  const [tbWide, setTbWide] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNowHm({ h: d.getHours(), m: d.getMinutes() });
    }, 60000);
    return () => clearInterval(t);
  }, []);
  const [nowHm, setNowHm] = useState(() => {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  });
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const [blockTitle, setBlockTitle] = useState("");

  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState(100);
  const [goalUnit, setGoalUnit] = useState("%");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [planExamDate, setPlanExamDate] = useState("");
  const [planTime, setPlanTime] = useState("19:30");
  const [planTopics, setPlanTopics] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const topics = planTopics
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!planExamDate || topics.length === 0) return;
    setGeneratingPlan(true);
    try {
      const start = new Date();
      const end = new Date(planExamDate);
      const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000));
      const [sh, sm] = planTime.split(":").map(Number);
      const endHour = String(((sh ?? 19) + 1) % 24).padStart(2, "0");
      const endMin = String(sm ?? 30).padStart(2, "0");

      for (let i = 0; i < topics.length; i++) {
        const offset = Math.floor((i * totalDays) / topics.length);
        const target = new Date(start);
        target.setDate(start.getDate() + offset);
        const iso = target.toISOString().slice(0, 10);
        await fetch("/api/timeblocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockDate: iso,
            startTime: planTime,
            endTime: `${endHour}:${endMin}`,
            title: `Ôn thi: ${topics[i]}`,
          }),
        });
      }
      setPlanTopics("");
      onNotify(`Đã tự động rải ${topics.length} buổi ôn thi vào Lịch!`);
      onRefresh();
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim()) return;
    const res = await fetch("/api/timeblocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockDate: selectedDate,
        startTime,
        endTime,
        title: blockTitle.trim(),
      }),
    });
    if (res.ok) {
      setBlockTitle("");
      onNotify(lang === "vi" ? "Đã thêm khung giờ tập trung!" : "Time block added!");
      onRefresh();
    }
  };

  const toggleBlock = async (b: TimeBlockRecord) => {
    await fetch(`/api/timeblocks/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !b.isDone }),
    });
    onRefresh();
  };

  const deleteBlock = async (id: string) => {
    await fetch(`/api/timeblocks/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalTitle.trim(),
        targetValue: goalTarget,
        unit: goalUnit.trim() || "%",
        deadline: goalDeadline || null,
      }),
    });
    if (res.ok) {
      setGoalTitle("");
      setGoalDeadline("");
      onNotify(lang === "vi" ? "Đã tạo mục tiêu mới!" : "Goal created!");
      onRefresh();
    }
  };

  const stepGoal = async (g: GoalRecord, delta: number) => {
    const nextVal = Math.max(0, Math.min(g.targetValue, g.currentValue + delta));
    await fetch(`/api/goals/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentValue: nextVal }),
    });
    onRefresh();
  };

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const dayBlocks = timeBlocks.filter((b) => b.blockDate === selectedDate);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* DAILY TIME BLOCKING */}
      <section className={cn("glass-card card-lift rounded-2xl p-6", tbWide ? "lg:col-span-12" : "lg:col-span-6")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              {lang === "vi" ? "Chặn khung giờ trong ngày (Time Blocking)" : "Daily Time Blocking"}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTbView("grid")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium",
                  tbView === "grid" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
                )}
              >
                <LayoutGrid className="h-3 w-3" /> Lưới giờ
              </button>
              <button
                type="button"
                onClick={() => setTbView("list")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium",
                  tbView === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
                )}
              >
                <List className="h-3 w-3" /> Danh sách
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTbWide((v) => !v)}
              title="Mở rộng toàn chiều rộng"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              {tbWide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </div>
        </div>

        <form onSubmit={handleAddBlock} className="mt-4 flex flex-wrap gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            type="text"
            value={blockTitle}
            onChange={(e) => setBlockTitle(e.target.value)}
            placeholder={lang === "vi" ? "Nội dung khung giờ..." : "Focus block task..."}
            className="min-w-[160px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            {lang === "vi" ? "Thêm" : "Add"}
          </button>
        </form>

        {tbView === "grid" ? (
          <div className="mt-4 max-h-[380px] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
            {Array.from({ length: 18 }, (_, i) => i + 6).map((hr) => {
              const hrStr = String(hr).padStart(2, "0");
              const slotBlocks = dayBlocks.filter((b) => b.startTime.startsWith(hrStr + ":"));
              const isCurrentHour = nowHm.h === hr && selectedDate === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={hr}
                  className="relative flex min-h-[38px] items-start gap-2.5 border-b border-[var(--border-subtle)]/60 py-1.5 last:border-b-0"
                >
                  <span className="w-11 shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                    {hrStr}:00
                  </span>
                  {isCurrentHour && (
                    <div
                      className="pointer-events-none absolute left-11 right-1 z-10 flex items-center"
                      style={{ top: `${Math.min(85, Math.round((nowHm.m / 60) * 100))}%` }}
                    >
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span className="h-[1.5px] flex-1 bg-rose-500/80" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {slotBlocks.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-1 min-w-[160px] items-center justify-between gap-2 rounded-lg border-l-4 px-2.5 py-1.5 text-xs shadow-xs"
                        style={{
                          borderLeftColor: b.color || "var(--accent)",
                          backgroundColor: "var(--bg-surface)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleBlock(b)}
                          className={cn(
                            "truncate text-left font-medium",
                            b.isDone
                              ? "line-through text-[var(--text-muted)]"
                              : "text-[var(--text-primary)]"
                          )}
                        >
                          <span className="mr-1.5 font-mono text-[10px] text-[var(--accent)]">
                            {b.startTime}–{b.endTime}
                          </span>
                          {b.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBlock(b.id)}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <ul className="mt-5 space-y-2.5">
          {dayBlocks.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
              {lang === "vi"
                ? "Chưa có khung giờ nào cho ngày này. Hãy chia nhỏ ngày thành các block 60–90 phút."
                : "No time blocks for this date yet."}
            </li>
          ) : (
            dayBlocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-3"
              >
                <button
                  type="button"
                  onClick={() => toggleBlock(b)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {b.isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  )}
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate text-xs font-medium",
                        b.isDone
                          ? "text-[var(--text-muted)] line-through"
                          : "text-[var(--text-primary)]"
                      )}
                    >
                      {b.title}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--accent)]">
                      {b.startTime} – {b.endTime}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => deleteBlock(b.id)}
                  className="text-[var(--text-muted)] hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
        )}
      </section>

      {/* SEMESTER GOALS */}
      <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-6">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-base font-medium text-[var(--text-primary)]">
            {lang === "vi" ? "Mục tiêu Học kỳ & Dự án dài hạn" : "Semester & Long-term Goals"}
          </h3>
        </div>

        <form onSubmit={handleAddGoal} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder={lang === "vi" ? "VD: Hoàn thành 50 bài LeetCode..." : "e.g., Solve 50 DSA problems..."}
            className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            min={1}
            value={goalTarget}
            onChange={(e) => setGoalTarget(Number(e.target.value))}
            className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            title="Mục tiêu"
          />
          <input
            type="text"
            value={goalUnit}
            onChange={(e) => setGoalUnit(e.target.value)}
            className="w-16 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            placeholder="Đơn vị"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            {lang === "vi" ? "Tạo" : "Create"}
          </button>
        </form>

        <ul className="mt-5 space-y-3">
          {goals.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
              {lang === "vi"
                ? "Chưa có mục tiêu dài hạn nào. Hãy đặt 2–3 mục tiêu rõ ràng cho học kỳ này."
                : "No semester goals yet."}
            </li>
          ) : (
            goals.map((g) => {
              const pct = Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100));
              const step = Math.max(1, Math.round(g.targetValue / 10));
              return (
                <li
                  key={g.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                      {g.title}
                      {g.deadline && pct < 70 && Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) <= 7 && (
                        <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                          Sắp hết hạn
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--accent)]">
                        {g.currentValue}/{g.targetValue} {g.unit} ({pct}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteGoal(g.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => stepGoal(g, 1)}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--text-primary)] hover:border-[var(--accent)]"
                    >
                      +1 {g.unit}
                    </button>
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={() => stepGoal(g, step)}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--accent)] hover:border-[var(--accent)]"
                      >
                        +{step} {g.unit}
                      </button>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    
      {/* TỰ ĐỘNG CHIA LỊCH ÔN THI (SMART EXAM REVISION PLANNER) */}
      <section className="glass-card card-lift p-6 lg:col-span-12">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-base font-medium text-[var(--text-primary)]">
            {lang === "vi"
              ? "Tự động Chia lịch Ôn thi (Smart Exam Planner)"
              : "Smart Exam Revision Planner"}
          </h3>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {lang === "vi"
            ? "Chọn ngày thi và liệt kê các chương cần ôn (mỗi dòng 1 chương) — hệ thống sẽ tự chia đều thành từng khung giờ từ hôm nay đến sát ngày thi."
            : "Pick an exam date and list chapters (one per line) to auto-schedule study blocks."}
        </p>
        <form onSubmit={handleGeneratePlan} className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="space-y-2 sm:col-span-4">
            <label className="block text-[11px] text-[var(--text-muted)]">Ngày thi</label>
            <input
              type="date"
              required
              value={planExamDate}
              onChange={(e) => setPlanExamDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
            />
            <label className="block text-[11px] text-[var(--text-muted)]">Khung giờ ôn mỗi ngày</label>
            <input
              type="time"
              value={planTime}
              onChange={(e) => setPlanTime(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-2 sm:col-span-8">
            <label className="block text-[11px] text-[var(--text-muted)]">
              Danh sách các chương / chủ đề (mỗi dòng 1 mục)
            </label>
            <textarea
              rows={3}
              value={planTopics}
              onChange={(e) => setPlanTopics(e.target.value)}
              placeholder={"Chương 1: Tổng quan\nChương 2: Cấu trúc dữ liệu tuyến tính\nChương 3: Cây và Đồ thị\nGiải đề thi thử"}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={generatingPlan}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generatingPlan ? "Đang tạo lịch..." : "Tự động rải lịch vào Lịch học"}
            </button>
          </div>
        </form>
      </section>
      <div className="lg:col-span-12">
        <GroupProjectPanel />
      </div>
    </div>
  );
}
