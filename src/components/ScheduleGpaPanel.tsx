"use client";

import { useState } from "react";
import { CalendarDays, Calculator, GraduationCap, Plus, Trash2 } from "lucide-react";

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

  // Máy tính điểm cần đạt cuối kỳ
  const [processScore, setProcessScore] = useState(8.0);
  const [processWeight, setProcessWeight] = useState(40);
  const [targetFinal, setTargetFinal] = useState(8.5);

  const finalWeight = Math.max(10, 100 - processWeight);
  const neededFinalScore = +(
    (targetFinal - (processScore * processWeight) / 100) /
    (finalWeight / 100)
  ).toFixed(2);

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
      <section className="glass-card card-lift rounded-2xl p-6">
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
            className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
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

      <div className="grid gap-6 lg:grid-cols-12">
        {/* SỔ ĐIỂM & TÍNH GPA */}
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Sổ điểm & Tính GPA tích lũy
              </h3>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                Tín chỉ: <strong className="font-mono">{totalCredits}</strong>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                Hệ 10: <strong className="font-mono text-[var(--accent)]">{avg10}</strong>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                GPA 4.0: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{avg4}</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddGrade} className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Tên học phần..."
              className="min-w-[160px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Học kỳ"
              className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            />
            <input
              type="number"
              min={1}
              max={15}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              className="w-16 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
              title="Số tín chỉ"
            />
            <input
              type="number"
              step="0.1"
              min={0}
              max={10}
              value={score10}
              onChange={(e) => setScore10(Number(e.target.value))}
              className="w-16 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
              title="Điểm hệ 10"
            />
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Lưu
            </button>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2 font-medium">Học phần</th>
                  <th className="py-2 font-medium">HK</th>
                  <th className="py-2 font-medium">TC</th>
                  <th className="py-2 font-medium">Hệ 10</th>
                  <th className="py-2 font-medium">Chữ</th>
                  <th className="py-2 font-medium">Hệ 4</th>
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

        {/* MÁY TÍNH ĐIỂM CẦN ĐẠT CUỐI KỲ */}
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Tính điểm cần đạt Cuối kỳ
            </h3>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Ước lượng điểm thi cuối kỳ cần đạt để đạt mục tiêu môn học
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Điểm quá trình hiện tại</span>
                <strong className="font-mono">{processScore}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={processScore}
                onChange={(e) => setProcessScore(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Trọng số quá trình / cuối kỳ</span>
                <strong className="font-mono">
                  {processWeight}% / {finalWeight}%
                </strong>
              </div>
              <input
                type="range"
                min={10}
                max={70}
                step={10}
                value={processWeight}
                onChange={(e) => setProcessWeight(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-[var(--text-secondary)]">Mục tiêu tổng kết</label>
              <select
                value={targetFinal}
                onChange={(e) => setTargetFinal(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
              >
                <option value={9.0}>Xuất sắc A+ (9.0)</option>
                <option value={8.5}>Giỏi A (8.5)</option>
                <option value={8.0}>Khá giỏi B+ (8.0)</option>
                <option value={7.0}>Khá B (7.0)</option>
                <option value={5.5}>Trung bình C (5.5)</option>
                <option value={4.0}>Qua môn D (4.0)</option>
              </select>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-center">
              <div className="text-[11px] text-[var(--text-muted)]">Điểm cuối kỳ tối thiểu cần đạt</div>
              <div className="mt-1 font-mono text-3xl font-bold text-[var(--accent)]">
                {neededFinalScore <= 0
                  ? "Đã đủ!"
                  : neededFinalScore > 10
                  ? `${neededFinalScore} (Vượt 10)`
                  : neededFinalScore}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
