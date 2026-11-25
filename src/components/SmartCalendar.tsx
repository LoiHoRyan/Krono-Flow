"use client";

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Grid,
  Plus,
  Snowflake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { TimeBlockRecord } from "./GoalsTimeblockPanel";
import type { ExamRecord } from "./DashboardBento";

function formatWeekdayFull(iso: string, lang: "vi" | "en"): string {
  const parts = iso.split("-").map(Number);
  const d = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildIcsContent(exams: ExamRecord[], timeBlocks: TimeBlockRecord[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KronoFlow//Study Calendar//VN",
  ];
  for (const ex of exams) {
    const dt = new Date(ex.examDate).toISOString().slice(0, 10).replaceAll("-", "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:exam-${ex.id}@kronoflow`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:[Kỳ thi] ${ex.title}`,
      "END:VEVENT"
    );
  }
  for (const tb of timeBlocks) {
    const d = tb.blockDate.replaceAll("-", "");
    const s = tb.startTime.replace(":", "") + "00";
    const e = tb.endTime.replace(":", "") + "00";
    lines.push(
      "BEGIN:VEVENT",
      `UID:tb-${tb.id}@kronoflow`,
      `DTSTART:${d}T${s}`,
      `DTEND:${d}T${e}`,
      `SUMMARY:${tb.title}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function SmartCalendar({
  subjects,
  sessions,
  exams,
  timeBlocks,
  frozenDates,
  onRefresh,
}: {
  subjects: SubjectOption[];
  sessions: SessionLogItem[];
  exams: ExamRecord[];
  timeBlocks: TimeBlockRecord[];
  frozenDates: string[];
  onRefresh: () => void;
}) {
  const { lang } = useLang();
  const todayObj = new Date();
  const todayKey = todayObj.toISOString().slice(0, 10);

  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [zoomTier, setZoomTier] = useState<"days" | "months" | "years">("days");
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());
  const [selectedDay, setSelectedDay] = useState(todayKey);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickStart, setQuickStart] = useState("19:30");
  const [quickEnd, setQuickEnd] = useState("21:00");
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-cal-notes");
      if (raw) setDayNotes(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const updateDayNote = (day: string, val: string) => {
    const next = { ...dayNotes };
    if (val.trim()) next[day] = val;
    else delete next[day];
    setDayNotes(next);
    try {
      localStorage.setItem("kronoflow-cal-notes", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const dayMap = new Map<string, number>();
  for (const s of completedSessions) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + s.actualMinutes);
  }

  const examDates = new Set(exams.map((e) => new Date(e.examDate).toISOString().slice(0, 10)));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const jumpToIsoDate = (iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
    const [y, m] = iso.split("-").map(Number);
    if (y && m) {
      setCalYear(y);
      setCalMonth(m - 1);
      setSelectedDay(iso);
      setZoomTier("days");
    }
  };

  const handleNavPrev = () => {
    if (zoomTier === "days") {
      const d = new Date(calYear, calMonth - 1, 1);
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    } else if (zoomTier === "months") {
      setCalYear((y) => y - 1);
    } else {
      setCalYear((y) => y - 12);
    }
  };

  const handleNavNext = () => {
    if (zoomTier === "days") {
      const d = new Date(calYear, calMonth + 1, 1);
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    } else if (zoomTier === "months") {
      setCalYear((y) => y + 1);
    } else {
      setCalYear((y) => y + 12);
    }
  };

  const cycleZoom = () => {
    setZoomTier((cur) => (cur === "days" ? "months" : cur === "months" ? "years" : "days"));
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const res = await fetch("/api/timeblocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockDate: selectedDay,
        startTime: quickStart,
        endTime: quickEnd,
        title: quickTitle.trim(),
      }),
    });
    if (res.ok) {
      setQuickTitle("");
      onRefresh();
    }
  };

  const handleExportIcs = () => {
    const ics = buildIcsContent(exams, timeBlocks);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-calendar-${todayKey}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const firstWeekday = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push(`${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const startYearGrid = Math.floor(calYear / 12) * 12;
  const yearGrid = Array.from({ length: 12 }, (_, i) => startYearGrid + i);

  const selectedDaySessions = completedSessions.filter(
    (s) => new Date(s.startedAt).toISOString().slice(0, 10) === selectedDay
  );
  const selectedDayBlocks = timeBlocks.filter((b) => b.blockDate === selectedDay);
  const selectedDayExams = exams.filter(
    (ex) => new Date(ex.examDate).toISOString().slice(0, 10) === selectedDay
  );

  // Dòng sự kiện Agenda (gộp kỳ thi & time blocks từ hôm nay trở đi)
  const agendaItems = [
    ...exams.map((e) => ({
      id: `ex-${e.id}`,
      date: new Date(e.examDate).toISOString().slice(0, 10),
      time: "Cả ngày",
      title: e.title,
      badge: lang === "vi" ? "Kỳ thi" : "Exam",
    })),
    ...timeBlocks.map((b) => ({
      id: `tb-${b.id}`,
      date: b.blockDate,
      time: `${b.startTime}–${b.endTime}`,
      title: b.title,
      badge: "Time Block",
    })),
  ]
    .filter((item) => item.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12);

  return (
    <section className="glass-card card-lift p-6">
      {/* Header điều khiển 1 chạm */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cycleZoom}
            title={
              lang === "vi"
                ? "Bấm để chuyển nhanh: Ngày → Tháng → Năm"
                : "Click to zoom: Days → Months → Years"
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--accent)]"
          >
            <CalendarIcon className="h-4 w-4 text-[var(--accent)]" />
            <span>
              {zoomTier === "days"
                ? lang === "vi"
                  ? `Tháng ${calMonth + 1}, ${calYear}`
                  : `${calMonth + 1} / ${calYear}`
                : zoomTier === "months"
                ? `${lang === "vi" ? "Chọn Tháng" : "Select Month"} · ${calYear}`
                : `${startYearGrid} – ${startYearGrid + 11}`}
            </span>
          </button>

          {/* Chọn Thứ/Ngày/Tháng/Năm trong 1 lần bấm */}
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => jumpToIsoDate(e.target.value)}
            title={lang === "vi" ? "Chọn nhanh Ngày/Tháng/Năm" : "Pick exact date"}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg bg-[var(--bg-elevated)] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
                viewMode === "month"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)]"
              )}
            >
              <Grid className="h-3 w-3" />
              {lang === "vi" ? "Tháng" : "Month"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
                viewMode === "agenda"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)]"
              )}
            >
              <List className="h-3 w-3" />
              Agenda
            </button>
          </div>

          <button
            type="button"
            onClick={() => jumpToIsoDate(todayKey)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
          >
            {lang === "vi" ? "Hôm nay" : "Today"}
          </button>
          <button
            type="button"
            onClick={handleExportIcs}
            title="Xuất lịch .ics sang Google/Apple Calendar"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <Download className="h-3 w-3" />
            .ics
          </button>
          <button
            type="button"
            onClick={handleNavPrev}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNavNext}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-secondary)]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hiển thị rõ Thứ, Ngày/Tháng/Năm đang chọn */}
      <div className="mt-2 text-xs font-medium capitalize text-[var(--accent)]">
        {formatWeekdayFull(selectedDay, lang)}
      </div>

      {viewMode === "agenda" ? (
        <ul className="mt-4 space-y-2">
          {agendaItems.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
              {lang === "vi"
                ? "Chưa có sự kiện hoặc kỳ thi nào sắp tới."
                : "No upcoming events or exams."}
            </li>
          ) : (
            agendaItems.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs"
              >
                <div>
                  <div className="font-medium text-[var(--text-primary)]">{it.title}</div>
                  <div className="text-[11px] capitalize text-[var(--text-muted)]">
                    {formatWeekdayFull(it.date, lang)} · {it.time}
                  </div>
                </div>
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                  {it.badge}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : zoomTier === "years" ? (
        <div className="animate-tab-in mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {yearGrid.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setCalYear(y);
                setZoomTier("months");
              }}
              className={cn(
                "rounded-xl border py-3 font-mono text-sm font-medium",
                y === calYear
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--accent)]"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      ) : zoomTier === "months" ? (
        <div className="animate-tab-in mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 12 }, (_, m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setCalMonth(m);
                setZoomTier("days");
              }}
              className={cn(
                "rounded-xl border py-3 text-xs font-medium",
                m === calMonth
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--accent)]"
              )}
            >
              {lang === "vi" ? `Tháng ${m + 1}` : `Month ${m + 1}`}
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-tab-in mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[var(--text-muted)]">
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
            const hasExam = examDates.has(iso);
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
                  {hasExam && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  {frozen && mins === 0 && <Snowflake className="h-2.5 w-2.5 text-sky-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Chi tiết & Thêm nhanh lịch ngay cho ngày đang chọn */}
      <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium capitalize text-[var(--text-primary)]">
            {formatWeekdayFull(selectedDay, lang)}
          </span>
          <span className="font-mono text-[var(--accent)]">
            {dayMap.get(selectedDay) ?? 0}p · {selectedDayBlocks.length} lịch
          </span>
        </div>

        {(selectedDayExams.length > 0 ||
          selectedDayBlocks.length > 0 ||
          selectedDaySessions.length > 0) && (
          <ul className="mt-2.5 space-y-1.5 text-xs">
            {selectedDayExams.map((ex) => (
              <li key={ex.id} className="font-medium text-amber-600 dark:text-amber-400">
                ★ {lang === "vi" ? "Kỳ thi:" : "Exam:"} {ex.title}
              </li>
            ))}
            {selectedDayBlocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span className="text-[var(--text-primary)]">• {b.title}</span>
                <span className="font-mono text-[11px] text-[var(--accent)]">
                  {b.startTime}–{b.endTime}
                </span>
              </li>
            ))}
            {selectedDaySessions.map((s) => {
              const sub = s.subjectId ? subjectMap.get(s.subjectId) : undefined;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between text-[var(--text-secondary)]"
                >
                  <span className="truncate">✓ {s.notes || sub?.name || s.mode}</span>
                  <span className="font-mono">{s.actualMinutes}p</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 border-t border-[var(--border-subtle)] pt-2.5">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            {lang === "vi" ? `Ghi chú nhanh ngày ${selectedDay}` : `Quick note for ${selectedDay}`}
          </label>
          <input
            type="text"
            value={dayNotes[selectedDay] ?? ""}
            onChange={(e) => updateDayNote(selectedDay, e.target.value)}
            placeholder={
              lang === "vi"
                ? "VD: Phòng thi B204, hạn nộp bài tập nhóm 23:59..."
                : "e.g. Exam room B204, assignment due 23:59..."
            }
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <form
          onSubmit={handleQuickAdd}
          className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-3"
        >
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
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={
              lang === "vi"
                ? `Thêm lịch cho ${selectedDay}...`
                : `Add event for ${selectedDay}...`
            }
            className="min-w-[140px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium"
          >
            <Plus className="h-3 w-3" />
            {lang === "vi" ? "Thêm" : "Add"}
          </button>
        </form>
      </div>
    </section>
  );
}
