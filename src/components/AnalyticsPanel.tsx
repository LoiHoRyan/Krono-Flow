"use client";

import { Download, Flame, TrendingUp, Award, Clock, Layers } from "lucide-react";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";

export function AnalyticsPanel({
  sessions,
  subjects,
}: {
  sessions: SessionLogItem[];
  subjects: SubjectOption[];
}) {
  const completed = sessions.filter((s) => s.status === "completed");
  const totalMinutes = completed.reduce((acc, s) => acc + s.actualMinutes, 0);
  const avgSession = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;

  const dayMinutes = new Map<string, number>();
  for (const s of completed) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    dayMinutes.set(key, (dayMinutes.get(key) ?? 0) + s.actualMinutes);
  }

  // 20 tuần (140 ngày) xếp gọn dạng ma trận GitHub chuẩn (gap 3px, ô 13px)
  const today = new Date();
  const totalWeeks = 20;
  const totalDays = totalWeeks * 7;
  const days: { date: string; minutes: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, minutes: dayMinutes.get(key) ?? 0 });
  }

  // Nhóm theo tuần (mỗi tuần 7 ô dọc) để không bao giờ bị giãn ngang
  const weeks: { date: string; minutes: number }[][] = [];
  for (let w = 0; w < totalWeeks; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }

  const last7 = days.slice(-7);
  const max7 = Math.max(30, ...last7.map((d) => d.minutes));

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const item = days[i];
    if (item && item.minutes > 0) streak++;
    else if (i < days.length - 1) break;
  }

  // Phân bổ theo môn học
  const bySubject = subjects
    .map((sub) => {
      const mins = completed
        .filter((s) => s.subjectId === sub.id)
        .reduce((a, b) => a + b.actualMinutes, 0);
      return { ...sub, mins };
    })
    .filter((s) => s.mins > 0)
    .sort((a, b) => b.mins - a.mins);

  const handleExportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), subjects, sessions }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getHeatColor = (mins: number) => {
    if (mins === 0) return "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]/50";
    if (mins < 30) return "bg-indigo-950/70 dark:bg-indigo-900/80 border border-indigo-700/40";
    if (mins < 60) return "bg-indigo-600/80 border border-indigo-500/40";
    if (mins < 120) return "bg-indigo-500 border border-indigo-400/50";
    return "bg-emerald-400 border border-emerald-300/60";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Flame className="h-4 w-4 text-amber-500" />
            Chuỗi ngày liên tục
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {streak} ngày
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            Tổng thời gian học
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {(totalMinutes / 60).toFixed(1)} giờ
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Award className="h-4 w-4 text-emerald-500" />
            Trung bình mỗi phiên
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {avgSession} phút
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Layers className="h-4 w-4 text-sky-500" />
            Sao lưu dữ liệu
          </div>
          <button
            type="button"
            onClick={handleExportJson}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất file JSON
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Heatmap kỷ luật học tập (20 tuần gần nhất)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Di chuột vào từng ô để xem tổng số phút tập trung trong ngày
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span>Ít</span>
            <span className="h-3 w-3 rounded-[3px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-900/80" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-600/80" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-500" />
            <span className="h-3 w-3 rounded-[3px] bg-emerald-400" />
            <span>Nhiều</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-2">
          <div className="inline-flex gap-[4px]">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[4px]">
                {week.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.minutes} phút`}
                    className={`h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-125 ${getHeatColor(
                      d.minutes
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:col-span-7">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Nhịp học 7 ngày gần nhất (phút)
            </h3>
          </div>
          <div className="mt-6 flex h-44 items-end gap-3">
            {last7.map((d) => {
              const heightPct = Math.round((d.minutes / max7) * 100);
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                    {d.minutes}p
                  </span>
                  <div className="flex h-28 w-full items-end rounded-lg bg-[var(--bg-elevated)] p-1">
                    <div
                      className="w-full rounded-md bg-[var(--accent)] transition-all"
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:col-span-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Phân bổ thời gian theo môn học
          </h3>
          <ul className="mt-5 space-y-3.5">
            {bySubject.length === 0 ? (
              <li className="text-xs text-[var(--text-muted)]">
                Hoàn thành phiên Pomodoro có gắn môn học để xem phân bổ tại đây.
              </li>
            ) : (
              bySubject.map((sub) => {
                const pct = totalMinutes > 0 ? Math.round((sub.mins / totalMinutes) * 100) : 0;
                return (
                  <li key={sub.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">{sub.name}</span>
                      <span className="font-mono text-[var(--text-muted)]">
                        {sub.mins}p ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: sub.color }}
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
