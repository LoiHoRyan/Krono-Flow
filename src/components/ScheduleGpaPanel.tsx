"use client";

import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { CalendarDays, Calculator, GraduationCap, Plus, Trash2,
  ShieldAlert,
  Download,
  Sparkles,
  Copy,
  Award,
} from "lucide-react";

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
  const [attCourse, setAttCourse] = useState("");
  const [attTotal, setAttTotal] = useState(15);
  const [whatIfCredits, setWhatIfCredits] = useState(3);
  const [whatIfScore, setWhatIfScore] = useState(8.5);
  const [ccScore, setCcScore] = useState(9.0);
  const [gkScore, setGkScore] = useState(8.0);
  const [ckScore, setCkScore] = useState(8.0);
  const [ccW, setCcW] = useState(10);
  const [gkW, setGkW] = useState(30);
  const [drlTitle, setDrlTitle] = useState("");
  const [drlPoints, setDrlPoints] = useState(5);
  const [drlItems, setDrlItems] = useState<{ id: string; title: string; points: number; date: string }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-drl");
      if (raw) setDrlItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveDrl = (next: { id: string; title: string; points: number; date: string }[]) => {
    setDrlItems(next);
    localStorage.setItem("kronoflow-drl", JSON.stringify(next));
  };
  const [whatIfList, setWhatIfList] = useState<{ id: string; credits: number; score10: number }[]>([]);

  const exportTimetableIcs = () => {
    const byDayMap: Record<number, string> = {
      1: "MO",
      2: "TU",
      3: "WE",
      4: "TH",
      5: "FR",
      6: "SA",
      7: "SU",
    };
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replaceAll("-", "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KronoFlow//Timetable//VI"];
    for (const sl of slots) {
      const st = sl.startTime.replace(":", "") + "00";
      const et = sl.endTime.replace(":", "") + "00";
      const byday = byDayMap[sl.dayOfWeek] ?? "MO";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${sl.id}@kronoflow`);
      lines.push(`DTSTART:${ymd}T${st}`);
      lines.push(`DTEND:${ymd}T${et}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byday}`);
      lines.push(`SUMMARY:${sl.title}`);
      if (sl.location) lines.push(`LOCATION:${sl.location}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kronoflow-timetable.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  const [attRecords, setAttRecords] = useState<
    { id: string; course: string; total: number; absent: number }[]
  >([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-attendance");
      if (raw) setAttRecords(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveAttendance = (next: { id: string; course: string; total: number; absent: number }[]) => {
    setAttRecords(next);
    localStorage.setItem("kronoflow-attendance", JSON.stringify(next));
  };

  const addAttCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attCourse.trim()) return;
    saveAttendance([
      ...attRecords,
      { id: String(Date.now()), course: attCourse.trim(), total: Math.max(1, attTotal), absent: 0 },
    ]);
    setAttCourse("");
  };

  const finalWeight = Math.max(10, 100 - processWeight);
  const neededFinalScore = +(
    (targetFinal - (processScore * processWeight) / 100) /
    (finalWeight / 100)
  ).toFixed(2);

  const hasSlotConflict = slots.some(
    (sl) =>
      sl.dayOfWeek === dayOfWeek &&
      !(endTime <= sl.startTime || startTime >= sl.endTime)
  );

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

  const exportGradesCsv = () => {
    const header = "Hoc phan,Hoc ky,Tin chi,Diem he 10,Diem chu,GPA he 4\n";
    const rows = grades
      .map((g) => {
        const c = toGpa4(g.score10);
        return `"${g.courseName.replaceAll('"', '""')}","${g.semester}",${g.credits},${g.score10},${c.letter},${c.gpa4}`;
      })
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-gpa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const semesterMap = new Map<string, { weighted4: number; credits: number }>();
  for (const g of grades) {
    const cur = semesterMap.get(g.semester) ?? { weighted4: 0, credits: 0 };
    cur.weighted4 += toGpa4(g.score10).gpa4 * g.credits;
    cur.credits += g.credits;
    semesterMap.set(g.semester, cur);
  }
  const semesterTrend = Array.from(semesterMap.entries()).map(([sem, v]) => ({
    sem,
    gpa: v.credits > 0 ? +(v.weighted4 / v.credits).toFixed(2) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* THỜI KHÓA BIỂU TUẦN */}
      <section className="glass-card card-lift rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Thời khóa biểu tuần (Thứ 2 – Chủ nhật)
            </h3>
          </div>
          {slots.length > 0 && (
            <button
              type="button"
              onClick={exportTimetableIcs}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5" /> Xuất lịch tuần (.ics)
            </button>
          )}
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
        {hasSlotConflict && (
          <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            ⚠ Cảnh báo trùng giờ: Khung {startTime}–{endTime} đang chồng lấn với một tiết học đã có trong cùng thứ.
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {DAYS.map((d) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === d.id);
            const semesterMap = new Map<string, { weighted4: number; credits: number }>();
  for (const g of grades) {
    const cur = semesterMap.get(g.semester) ?? { weighted4: 0, credits: 0 };
    cur.weighted4 += toGpa4(g.score10).gpa4 * g.credits;
    cur.credits += g.credits;
    semesterMap.set(g.semester, cur);
  }
  const semesterTrend = Array.from(semesterMap.entries()).map(([sem, v]) => ({
    sem,
    gpa: v.credits > 0 ? +(v.weighted4 / v.credits).toFixed(2) : 0,
  }));

  return (
              <div
                key={d.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  d.id === (new Date().getDay() === 0 ? 7 : new Date().getDay())
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]/50 ring-1 ring-[var(--accent)]/30"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                )}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-semibold text-[var(--text-primary)]">
                  <span>{d.label}</span>
                  {d.id === (new Date().getDay() === 0 ? 7 : new Date().getDay()) && (
                    <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-medium text-white">
                      Hôm nay
                    </span>
                  )}
                </div>
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
        <section className="privacy-sensitive glass-card card-lift rounded-2xl p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Sổ điểm & Tính GPA tích lũy
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={exportGradesCsv}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
              >
                Xuất CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  const summary = [
                    `🎓 Tổng kết GPA KronoFlow`,
                    `- Tổng tín chỉ: ${totalCredits}`,
                    `- Điểm trung bình hệ 10: ${avg10}`,
                    `- GPA hệ 4.0: ${avg4}`,
                    ...grades.map((g) => `• ${g.courseName} (${g.credits} TC): ${g.score10} (${toGpa4(g.score10).letter})`),
                  ].join("\n");
                  navigator.clipboard?.writeText(summary).catch(() => {});
                  window.alert("Đã sao chép bảng điểm GPA vào bộ nhớ tạm!");
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Copy className="h-3 w-3" /> Chép bảng điểm
              </button>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                Tín chỉ: <strong className="font-mono">{totalCredits}</strong>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                Hệ 10: <strong className="font-mono text-[var(--accent)]">{avg10}</strong>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                GPA 4.0: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{avg4}</strong>
              </div>
              {totalCredits > 0 && (
                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-1.5 font-medium text-[var(--accent)]">
                  Xếp loại:{" "}
                  {Number(avg4) >= 3.6
                    ? "Xuất sắc"
                    : Number(avg4) >= 3.2
                    ? "Giỏi"
                    : Number(avg4) >= 2.5
                    ? "Khá"
                    : Number(avg4) >= 2.0
                    ? "Trung bình"
                    : "Cần cải thiện"}
                </div>
              )}
            </div>
          </div>
          {grades.length >= 2 && (() => {
            const sorted = [...grades].sort((a, b) => b.score10 - a.score10);
            const best = sorted[0];
            const low = sorted[sorted.length - 1];
            if (!best || !low) return null;
            return (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                  Môn điểm cao nhất: <strong>{best.courseName}</strong> ({best.score10})
                </span>
                <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                  Cần ưu tiên cải thiện: <strong>{low.courseName}</strong> ({low.score10})
                </span>
              </div>
            );
          })()}
          {grades.length > 0 && (() => {
            const buckets: Record<string, number> = { "A+/A": 0, "B+/B": 0, "C+/C": 0, "D/F": 0 };
            for (const g of grades) {
              const lt = toGpa4(g.score10).letter;
              if (lt.startsWith("A")) buckets["A+/A"] = (buckets["A+/A"] ?? 0) + g.credits;
              else if (lt.startsWith("B")) buckets["B+/B"] = (buckets["B+/B"] ?? 0) + g.credits;
              else if (lt.startsWith("C")) buckets["C+/C"] = (buckets["C+/C"] ?? 0) + g.credits;
              else buckets["D/F"] = (buckets["D/F"] ?? 0) + g.credits;
            }
            const tot = Math.max(1, totalCredits);
            const colors: Record<string, string> = {
              "A+/A": "bg-emerald-500",
              "B+/B": "bg-sky-500",
              "C+/C": "bg-amber-400",
              "D/F": "bg-rose-500",
            };
            return (
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[var(--text-muted)]">
                  <span>Phân bố điểm chữ theo tín chỉ:</span>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(buckets).map(([k, v]) => (
                      <span key={k}>
                        {k}: <strong className="font-mono text-[var(--text-primary)]">{Math.round((v / tot) * 100)}%</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  {Object.entries(buckets).map(([k, v]) => (
                    <div
                      key={k}
                      className={colors[k] ?? "bg-[var(--accent)]"}
                      style={{ width: `${(v / tot) * 100}%` }}
                      title={`${k}: ${v} tín chỉ`}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

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
                  const semesterMap = new Map<string, { weighted4: number; credits: number }>();
  for (const g of grades) {
    const cur = semesterMap.get(g.semester) ?? { weighted4: 0, credits: 0 };
    cur.weighted4 += toGpa4(g.score10).gpa4 * g.credits;
    cur.credits += g.credits;
    semesterMap.set(g.semester, cur);
  }
  const semesterTrend = Array.from(semesterMap.entries()).map(([sem, v]) => ({
    sem,
    gpa: v.credits > 0 ? +(v.weighted4 / v.credits).toFixed(2) : 0,
  }));

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
          {semesterTrend.length > 0 && (
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <div className="text-xs font-medium text-[var(--text-secondary)]">
                Xu hướng GPA (Hệ 4.0) theo Học kỳ
              </div>
              <div className="mt-3 flex h-28 items-end gap-3">
                {semesterTrend.map((st) => (
                  <div key={st.sem} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">
                      {st.gpa.toFixed(2)}
                    </span>
                    <div className="flex h-16 w-full max-w-[56px] items-end rounded-lg bg-[var(--bg-elevated)] p-1">
                      <div
                        className="progress-sheen w-full rounded bg-[var(--accent)]"
                        style={{ height: `${Math.max(8, Math.round((st.gpa / 4) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{st.sem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

            <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
              <div className="font-semibold text-[var(--text-primary)]">
                Tính nhanh 3 cột điểm (CC {ccW}% · GK {gkW}% · CK {Math.max(0, 100 - ccW - gkW)}%)
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <label className="text-[10px] text-[var(--text-muted)]">
                  Chuyên cần
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={ccScore}
                    onChange={(e) => setCcScore(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)]"
                  />
                </label>
                <label className="text-[10px] text-[var(--text-muted)]">
                  Giữa kỳ
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={gkScore}
                    onChange={(e) => setGkScore(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)]"
                  />
                </label>
                <label className="text-[10px] text-[var(--text-muted)]">
                  Cuối kỳ
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={ckScore}
                    onChange={(e) => setCkScore(Number(e.target.value))}
                    className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)]"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setCcW(10); setGkW(30); }}
                    className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px]"
                  >
                    10-30-60
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCcW(10); setGkW(20); }}
                    className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px]"
                  >
                    10-20-70
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCcW(20); setGkW(30); }}
                    className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px]"
                  >
                    20-30-50
                  </button>
                </div>
                {(() => {
                  const ckW = Math.max(0, 100 - ccW - gkW);
                  const total = +((ccScore * ccW + gkScore * gkW + ckScore * ckW) / 100).toFixed(2);
                  return (
                    <span className="font-mono font-semibold text-[var(--accent)]">
                      Tổng: {total} ({toGpa4(total).letter})
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MÔ PHỎNG GPA GIẢ ĐỊNH (WHAT-IF GPA SIMULATOR) */}
      {(() => {
        const realW4 = grades.reduce((a, g) => a + toGpa4(g.score10).gpa4 * g.credits, 0);
        const simCredits = whatIfList.reduce((a, x) => a + x.credits, 0);
        const simW4 = whatIfList.reduce((a, x) => a + toGpa4(x.score10).gpa4 * x.credits, 0);
        const totalC = totalCredits + simCredits;
        const projGpa4 = totalC > 0 ? +((realW4 + simW4) / totalC).toFixed(2) : 0;
        const delta = +(projGpa4 - Number(avg4)).toFixed(2);
        return (
          <section className="privacy-sensitive glass-card card-lift rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-base font-medium text-[var(--text-primary)]">
                  Mô phỏng GPA giả định ("Nếu kỳ này đạt...")
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-muted)]">GPA dự kiến:</span>
                <strong className="font-mono text-base text-[var(--accent)]">{projGpa4.toFixed(2)}</strong>
                {whatIfList.length > 0 && (
                  <span className={delta >= 0 ? "font-mono text-emerald-600" : "font-mono text-rose-500"}>
                    ({delta >= 0 ? `+${delta}` : delta})
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <label className="text-[var(--text-secondary)]">Tín chỉ:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={whatIfCredits}
                onChange={(e) => setWhatIfCredits(Number(e.target.value))}
                className="w-16 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs"
              />
              <label className="text-[var(--text-secondary)]">Điểm hệ 10 dự kiến:</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={whatIfScore}
                onChange={(e) => setWhatIfScore(Number(e.target.value))}
                className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  setWhatIfList((prev) => [
                    ...prev,
                    { id: String(Date.now()), credits: Math.max(1, whatIfCredits), score10: Math.min(10, Math.max(0, whatIfScore)) },
                  ])
                }
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm môn giả định
              </button>
              {whatIfList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWhatIfList([])}
                  className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
                >
                  Xóa nháp
                </button>
              )}
            </div>
            {whatIfList.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {whatIfList.map((w, idx) => (
                  <span
                    key={w.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs"
                  >
                    Môn #{idx + 1}: {w.credits} TC · {w.score10}đ ({toGpa4(w.score10).letter})
                    <button
                      type="button"
                      onClick={() => setWhatIfList((prev) => prev.filter((x) => x.id !== w.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* THEO DÕI CHUYÊN CẦN & CẢNH BÁO CẤM THI (ATTENDANCE GUARD) */}
      <section className="glass-card card-lift rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              Theo dõi Chuyên cần & Cảnh báo cấm thi (Ngưỡng 20%)
            </h3>
          </div>
        </div>
        <form onSubmit={addAttCourse} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={attCourse}
            onChange={(e) => setAttCourse(e.target.value)}
            placeholder="Tên môn học cần theo dõi buổi vắng..."
            className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            min={1}
            max={60}
            value={attTotal}
            onChange={(e) => setAttTotal(Number(e.target.value))}
            title="Tổng số buổi học kỳ"
            className="w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm môn
          </button>
        </form>
        {attRecords.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attRecords.map((rec) => {
              const pct = Math.round((rec.absent / Math.max(1, rec.total)) * 100);
              const danger = pct >= 20;
              const warn = pct >= 13 && pct < 20;
              return (
                <div
                  key={rec.id}
                  className={cn(
                    "rounded-xl border p-3.5 text-xs",
                    danger
                      ? "border-rose-500/50 bg-rose-500/10"
                      : warn
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-[var(--text-primary)]">
                      {rec.course}
                    </span>
                    <button
                      type="button"
                      onClick={() => saveAttendance(attRecords.filter((x) => x.id !== rec.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">
                      Vắng: <strong>{rec.absent}/{rec.total}</strong> buổi ({pct}%)
                    </span>
                    {danger && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Nguy cơ cấm thi
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        saveAttendance(
                          attRecords.map((x) =>
                            x.id === rec.id ? { ...x, absent: Math.min(x.total, x.absent + 1) } : x
                          )
                        )
                      }
                      className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1 font-medium text-rose-600 hover:bg-rose-500/10"
                    >
                      +1 buổi vắng
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveAttendance(
                          attRecords.map((x) =>
                            x.id === rec.id ? { ...x, absent: Math.max(0, x.absent - 1) } : x
                          )
                        )
                      }
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[var(--text-muted)]"
                    >
                      -1
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ĐIỂM RÈN LUYỆN & HOẠT ĐỘNG NGOẠI KHÓA */}
      <section className="glass-card card-lift rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              Điểm rèn luyện & Hoạt động ngoại khóa
            </h3>
          </div>
          <span className="rounded-xl bg-[var(--accent-soft)] px-3 py-1 font-mono text-xs font-semibold text-[var(--accent)]">
            Tổng cộng: {Math.min(100, 65 + drlItems.reduce((a, b) => a + b.points, 0))} / 100 điểm (nền 65đ)
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!drlTitle.trim()) return;
            saveDrl([
              { id: String(Date.now()), title: drlTitle.trim(), points: drlPoints, date: new Date().toISOString().slice(0, 10) },
              ...drlItems,
            ]);
            setDrlTitle("");
          }}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            type="text"
            value={drlTitle}
            onChange={(e) => setDrlTitle(e.target.value)}
            placeholder="VD: Tham gia Hội thảo AI, Hiến máu, CLB Tin học..."
            className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            min={1}
            max={35}
            value={drlPoints}
            onChange={(e) => setDrlPoints(Number(e.target.value))}
            title="Điểm cộng"
            className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
          />
          <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> Ghi nhận
          </button>
        </form>
        {drlItems.length > 0 && (
          <ul className="zebra-list mt-3 space-y-1.5">
            {drlItems.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              >
                <span className="truncate text-[var(--text-primary)]">
                  {it.title} <span className="text-[10px] text-[var(--text-muted)]">({it.date})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-emerald-600">+{it.points}đ</span>
                  <button
                    type="button"
                    onClick={() => saveDrl(drlItems.filter((x) => x.id !== it.id))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}