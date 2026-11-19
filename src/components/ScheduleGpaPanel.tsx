"use client";

import { useState } from "react";
import { CalendarDays, GraduationCap, Plus, Trash2 } from "lucide-react";

export interface ScheduleSlotRecord {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  location: string | null;
  color: string;
}

export interface GradeRecord {
  id: string;
  courseName: string;
  credits: number;
  score10: number;
  semester: string;
}

const DAYS = [
  { id: 1, label: "Thứ 2" },
  { id: 2, label: "Thứ 3" },
  { id: 3, label: "Thứ 4" },
  { id: 4, label: "Thứ 5" },
  { id: 5, label: "Thứ 6" },
  { id: 6, label: "Thứ 7" },
  { id: 7, label: "CN" },
];

function toGpa4(score10: number): { gpa4: number; letter: string } {
  if (score10 >= 9.0) return { gpa4: 4.0, letter: "A+" };
  if (score10 >= 8.5) return { gpa4: 4.0, letter: "A" };
  if (score10 >= 8.0) return { gpa4: 3.5, letter: "B+" };
  if (score10 >= 7.0) return { gpa4: 3.0, letter: "B" };
  if (score10 >= 6.5) return { gpa4: 2.5, letter: "C+" };
  if (score10 >= 5.5) return { gpa4: 2.0, letter: "C" };
  if (score10 >= 5.0) return { gpa4: 1.5, letter: "D+" };
  if (score10 >= 4.0) return { gpa4: 1.0, letter: "D" };
  return { gpa4: 0.0, letter: "F" };
}

export function ScheduleGpaPanel({
  slots,
  grades,
  onRefresh,
}: {
  slots: ScheduleSlotRecord[];
  grades: GradeRecord[];
  onRefresh: () => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [slotTitle, setSlotTitle] = useState("");
  const [location, setLocation] = useState("");

  const [courseName, setCourseName] = useState("");
  const [credits, setCredits] = useState(3);
  const [score10, setScore10] = useState(8.5);
  const [semester, setSemester] = useState("HK1");

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTitle.trim()) return;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek,
        startTime,
        endTime,
        title: slotTitle.trim(),
        location: location.trim() || undefined,
      }),
    });
    if (res.ok) {
      setSlotTitle("");
      setLocation("");
      onRefresh();
    }
  };

  const handleDeleteSlot = async (id: string) => {
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseName: courseName.trim(),
        credits,
        score10,
        semester: semester.trim() || "HK1",
      }),
    });
    if (res.ok) {
      setCourseName("");
      onRefresh();
    }
  };

  const handleDeleteGrade = async (id: string) => {
    await fetch(`/api/grades/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const totalCredits = grades.reduce((a, g) => a + g.credits, 0);
  const avg10 =
    totalCredits > 0
      ? (grades.reduce((a, g) => a + g.score10 * g.credits, 0) / totalCredits).toFixed(2)
      : "0.00";
  const avg4 =
    totalCredits > 0
      ? (
          grades.reduce((a, g) => a + toGpa4(g.score10).gpa4 * g.credits, 0) / totalCredits
        ).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      {/* THỜI KHÓA BIỂU TUẦN */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Thời khóa biểu tuần (Thứ 2 – Chủ nhật)
          </h3>
        </div>

        <form onSubmit={handleAddSlot} className="mt-4 flex flex-wrap gap-2">
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
          >
            {DAYS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
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
            value={slotTitle}
            onChange={(e) => setSlotTitle(e.target.value)}
            placeholder="Môn học / Ca tự học..."
            className="min-w-[160px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Phòng / Link..."
            className="w-32 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm lịch
          </button>
        </form>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {DAYS.map((d) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === d.id);
            return (
              <div
                key={d.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
              >
                <div className="text-xs font-semibold text-[var(--text-primary)]">{d.label}</div>
                <div className="mt-2 space-y-2">
                  {daySlots.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-muted)]">Trống</p>
                  ) : (
                    daySlots.map((sl) => (
                      <div
                        key={sl.id}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-[11px]"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-medium text-[var(--text-primary)]">{sl.title}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(sl.id)}
                            className="text-[var(--text-muted)] hover:text-rose-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-[var(--accent)]">
                          {sl.startTime} – {sl.endTime}
                        </div>
                        {sl.location && (
                          <div className="truncate text-[10px] text-[var(--text-muted)]">
                            {sl.location}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SỔ ĐIỂM & TÍNH GPA */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Sổ điểm & Tính GPA tích lũy
            </h3>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
              Tín chỉ: <strong className="font-mono">{totalCredits}</strong>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
              TB Hệ 10: <strong className="font-mono text-[var(--accent)]">{avg10}</strong>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
              GPA Hệ 4.0: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{avg4}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddGrade} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Tên học phần..."
            className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="Học kỳ"
            className="w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
          />
          <input
            type="number"
            min={1}
            max={15}
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            title="Số tín chỉ"
          />
          <input
            type="number"
            step="0.1"
            min={0}
            max={10}
            value={score10}
            onChange={(e) => setScore10(Number(e.target.value))}
            className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            title="Điểm hệ 10"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Lưu điểm
          </button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="py-2 font-medium">Học phần</th>
                <th className="py-2 font-medium">Học kỳ</th>
                <th className="py-2 font-medium">Tín chỉ</th>
                <th className="py-2 font-medium">Hệ 10</th>
                <th className="py-2 font-medium">Điểm chữ</th>
                <th className="py-2 font-medium">Hệ 4.0</th>
                <th className="py-2 text-right font-medium">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {grades.map((g) => {
                const conv = toGpa4(g.score10);
                return (
                  <tr key={g.id}>
                    <td className="py-2.5 font-medium text-[var(--text-primary)]">{g.courseName}</td>
                    <td className="py-2.5 text-[var(--text-muted)]">{g.semester}</td>
                    <td className="py-2.5 font-mono">{g.credits}</td>
                    <td className="py-2.5 font-mono">{g.score10.toFixed(1)}</td>
                    <td className="py-2.5 font-mono font-semibold text-[var(--accent)]">{conv.letter}</td>
                    <td className="py-2.5 font-mono">{conv.gpa4.toFixed(1)}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteGrade(g.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="inline h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
