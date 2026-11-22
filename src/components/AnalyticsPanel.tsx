"use client";

import { Download, Flame, TrendingUp, Award, Clock, Layers, Trophy, Lock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";

export function AnalyticsPanel({
  sessions,
  subjects,
  totalHabits = 0,
  totalCards = 0,
}: {
  sessions: SessionLogItem[];
  subjects: SubjectOption[];
  totalHabits?: number;
  totalCards?: number;
}) {
  const { lang, t } = useLang();
  const completed = sessions.filter((s) => s.status === "completed");
  const totalMinutes = completed.reduce((acc, s) => acc + s.actualMinutes, 0);
  const avgSession = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;

  const dayMinutes = new Map<string, number>();
  for (const s of completed) {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    dayMinutes.set(key, (dayMinutes.get(key) ?? 0) + s.actualMinutes);
  }

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

  const weeks: { date: string; minutes: number }[][] = [];
  for (let w = 0; w < totalWeeks; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }

  const last7 = days.slice(-7);
  const max7 = Math.max(30, ...last7.map((d) => d.minutes));

  const thisWeekMins = days.slice(-7).reduce((a, b) => a + b.minutes, 0);
  const prevWeekMins = days.slice(-14, -7).reduce((a, b) => a + b.minutes, 0);
  const weekDeltaPct =
    prevWeekMins > 0
      ? Math.round(((thisWeekMins - prevWeekMins) / prevWeekMins) * 100)
      : thisWeekMins > 0
      ? 100
      : 0;
  const bestDay7 = last7.reduce((a, b) => (b.minutes > a.minutes ? b : a), last7[0]!);

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const item = days[i];
    if (item && item.minutes > 0) streak++;
    else if (i < days.length - 1) break;
  }

  const peakBuckets = [
    { label: lang === "vi" ? "Sáng (5h–11h)" : "Morning (5–11)", mins: 0 },
    { label: lang === "vi" ? "Chiều (12h–17h)" : "Afternoon (12–17)", mins: 0 },
    { label: lang === "vi" ? "Tối (18h–22h)" : "Evening (18–22)", mins: 0 },
    { label: lang === "vi" ? "Đêm (23h–4h)" : "Late Night (23–4)", mins: 0 },
  ];
  for (const s of completed) {
    const h = new Date(s.startedAt).getHours();
    const idx = h >= 5 && h <= 11 ? 0 : h >= 12 && h <= 17 ? 1 : h >= 18 && h <= 22 ? 2 : 3;
    peakBuckets[idx]!.mins += s.actualMinutes;
  }
  const peakMax = Math.max(1, ...peakBuckets.map((b) => b.mins));
  const bestSlot = peakBuckets.reduce((a, b) => (b.mins > a.mins ? b : a), peakBuckets[0]!);

  const bySubject = subjects
    .map((sub) => {
      const mins = completed
        .filter((s) => s.subjectId === sub.id)
        .reduce((a, b) => a + b.actualMinutes, 0);
      return { ...sub, mins };
    })
    .filter((s) => s.mins > 0)
    .sort((a, b) => b.mins - a.mins);

  const achievements = [
    {
      title: lang === "vi" ? "Bước chân đầu tiên" : "First Step",
      desc: lang === "vi" ? "Hoàn thành 1 phiên tập trung" : "Complete 1 focus session",
      done: completed.length >= 1,
    },
    {
      title: lang === "vi" ? "Giữ nhịp 3 ngày" : "3-Day Rhythm",
      desc: lang === "vi" ? "Đạt chuỗi 3 ngày liên tục" : "Reach a 3-day streak",
      done: streak >= 3,
    },
    {
      title: lang === "vi" ? "Tuần lễ Kỷ luật" : "Discipline Week",
      desc: lang === "vi" ? "Đạt chuỗi 7 ngày liên tục" : "Reach a 7-day streak",
      done: streak >= 7,
    },
    {
      title: lang === "vi" ? "Chiến binh 10 giờ" : "10-Hour Scholar",
      desc: lang === "vi" ? "Tích lũy tổng 600 phút học" : "Log 600 total study minutes",
      done: totalMinutes >= 600,
    },
    {
      title: lang === "vi" ? "Người kiến tạo" : "Organizer",
      desc: lang === "vi" ? "Tạo ít nhất 3 môn học" : "Create at least 3 subjects",
      done: subjects.length >= 3,
    },
    {
      title: lang === "vi" ? "Bậc thầy Trí nhớ" : "Memory Master",
      desc: lang === "vi" ? "Tạo ít nhất 10 thẻ Flashcards" : "Create 10+ Flashcards",
      done: totalCards >= 10,
    },
    {
      title: lang === "vi" ? "Kỷ luật Thói quen" : "Habit Builder",
      desc: lang === "vi" ? "Theo dõi ít nhất 3 thói quen" : "Track at least 3 habits",
      done: totalHabits >= 3,
    },
    {
      title: lang === "vi" ? "Bền bỉ Deep Work" : "Deep Work Pro",
      desc: lang === "vi" ? "Hoàn thành 20 phiên học" : "Complete 20 focus sessions",
      done: completed.length >= 20,
    },
  ];

  const handleDownloadStudyCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText("KRONOFLOW · STUDY ACHIEVEMENT CARD", 72, 92);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 54px Georgia, serif";
    ctx.fillText("Hành trình Kỷ luật & Tập trung", 72, 165);

    const unlockedCount = achievements.filter((a) => a.done).length;
    const stats = [
      { label: "CHUỖI NGÀY (STREAK)", value: `${streak} ngày` },
      { label: "TỔNG GIỜ HỌC", value: `${(totalMinutes / 60).toFixed(1)} giờ` },
      { label: "PHIÊN HOÀN THÀNH", value: `${completed.length} phiên` },
      { label: "HUY HIỆU MỞ KHÓA", value: `${unlockedCount} / ${achievements.length}` },
    ];

    stats.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 72 + col * 540;
      const y = 225 + row * 155;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x, y, 500, 125);
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.strokeRect(x, y, 500, 125);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 16px system-ui, sans-serif";
      ctx.fillText(st.label, x + 28, y + 44);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 40px monospace";
      ctx.fillText(st.value, x + 28, y + 96);
    });

    ctx.fillStyle = "#64748b";
    ctx.font = "500 18px system-ui, sans-serif";
    ctx.fillText(`Xuất ngày ${new Date().toLocaleDateString("vi-VN")} · kronoflow`, 72, 575);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `kronoflow-study-card-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const handleExportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), subjects, sessions }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getHeatColor = (mins: number) => {
    if (mins === 0) return "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]/50";
    if (mins < 30) return "bg-emerald-200 dark:bg-emerald-950";
    if (mins < 60) return "bg-emerald-400 dark:bg-emerald-800";
    if (mins < 120) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-400";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card card-lift rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Flame className="h-4 w-4 text-amber-500" />
            {lang === "vi" ? "Chuỗi ngày liên tục" : "Current Streak"}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {streak} {lang === "vi" ? "ngày" : "days"}
          </div>
        </div>

        <div className="glass-card card-lift rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            {lang === "vi" ? "Tổng thời gian học" : "Total Study Time"}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {(totalMinutes / 60).toFixed(1)} {lang === "vi" ? "giờ" : "hrs"}
          </div>
        </div>

        <div className="glass-card card-lift rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Award className="h-4 w-4 text-emerald-500" />
            {lang === "vi" ? "Trung bình mỗi phiên" : "Avg. Session"}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {avgSession} {lang === "vi" ? "phút" : "min"}
          </div>
        </div>

        <div className="glass-card card-lift flex flex-col justify-between rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Layers className="h-4 w-4 text-sky-500" />
            {lang === "vi" ? "Báo cáo nhanh" : "Quick Export"}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={handleExportJson}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              JSON
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-2 text-xs font-medium text-[var(--text-primary)]"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadStudyCard}
              title="Tải ảnh Thẻ Thành tích PNG"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2 py-2 text-xs font-medium text-[var(--accent)]"
            >
              PNG
            </button>
          </div>
        </div>
      </div>

      <section className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {lang === "vi"
                ? "Heatmap kỷ luật học tập (20 tuần gần nhất)"
                : "Study Consistency Heatmap (Last 20 Weeks)"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {lang === "vi"
                ? "Di chuột vào từng ô để xem tổng số phút tập trung trong ngày"
                : "Hover over any cell to inspect daily focus minutes"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span>{lang === "vi" ? "Ít" : "Less"}</span>
            <span className="h-3 w-3 rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" />
            <span className="h-3 w-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-950" />
            <span className="h-3 w-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-800" />
            <span className="h-3 w-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-600" />
            <span className="h-3 w-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-400" />
            <span>{lang === "vi" ? "Nhiều" : "More"}</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-2">
          <div className="inline-flex gap-[4px]">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[4px]">
                {week.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.minutes}m`}
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
        <section className="glass-card rounded-2xl p-6 lg:col-span-7">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {lang === "vi" ? "Nhịp học 7 ngày gần nhất (phút)" : "Last 7 Days Focus (min)"}
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

        <section className="glass-card rounded-2xl p-6 lg:col-span-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {lang === "vi" ? "Phân bổ theo môn học" : "Time by Subject"}
          </h3>
          <ul className="mt-5 space-y-3.5">
            {bySubject.length === 0 ? (
              <li className="text-xs text-[var(--text-muted)]">
                {lang === "vi"
                  ? "Hoàn thành phiên Pomodoro có gắn môn học để xem phân bổ."
                  : "Complete a tagged Pomodoro session to see breakdown."}
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

      {/* TÓM TẮT HIỆU SUẤT TUẦN (WEEKLY DIGEST) */}
      <section className="glass-card card-lift flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">
            {lang === "vi" ? "Báo cáo So sánh Tuần (Weekly Digest)" : "Weekly Digest"}
          </span>
          <h3 className="mt-0.5 text-base font-medium text-[var(--text-primary)]">
            {lang === "vi"
              ? `Tuần này bạn đã tập trung ${thisWeekMins} phút`
              : `You focused ${thisWeekMins} minutes this week`}
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {lang === "vi"
              ? `Tuần trước: ${prevWeekMins} phút · Ngày chăm nhất: ${bestDay7.date} (${bestDay7.minutes}p)`
              : `Last week: ${prevWeekMins}m · Best day: ${bestDay7.date} (${bestDay7.minutes}m)`}
          </p>
        </div>
        <span
          className={cn(
            "rounded-xl px-3.5 py-2 font-mono text-sm font-bold",
            weekDeltaPct >= 0
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
          )}
        >
          {weekDeltaPct >= 0 ? `+${weekDeltaPct}%` : `${weekDeltaPct}%`}
        </span>
      </section>

      {/* GIỜ VÀNG TẬP TRUNG */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {lang === "vi" ? "Phân tích Giờ vàng tập trung" : "Peak Focus Hours"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {bestSlot.mins > 0
                ? `${lang === "vi" ? "Khung giờ hiệu quả nhất của bạn:" : "Your peak window:"} ${bestSlot.label} (${bestSlot.mins}p)`
                : lang === "vi"
                ? "Hoàn thành vài phiên Pomodoro để hệ thống nhận diện khung giờ vàng của bạn"
                : "Complete sessions to discover your peak focus window"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {peakBuckets.map((b) => {
            const pct = Math.round((b.mins / peakMax) * 100);
            return (
              <div
                key={b.label}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5"
              >
                <div className="text-xs font-medium text-[var(--text-secondary)]">{b.label}</div>
                <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
                  {b.mins}p
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* NHỊP SINH HỌC TẬP TRUNG (FOCUS ENERGY TIMELINE) */}
      {(() => {
        const blocks = [
          { id: "morning", label: "Sáng sớm (05–11h)", hours: [5, 6, 7, 8, 9, 10], mins: 0 },
          { id: "afternoon", label: "Trưa–Chiều (11–17h)", hours: [11, 12, 13, 14, 15, 16], mins: 0 },
          { id: "evening", label: "Buổi tối (17–22h)", hours: [17, 18, 19, 20, 21], mins: 0 },
          { id: "night", label: "Đêm khuya (22–05h)", hours: [22, 23, 0, 1, 2, 3, 4], mins: 0 },
        ];
        for (const s of sessions) {
          if (s.status !== "completed") continue;
          const hr = new Date(s.startedAt).getHours();
          const b = blocks.find((x) => x.hours.includes(hr));
          if (b) b.mins += s.actualMinutes;
        }
        const maxB = Math.max(1, ...blocks.map((b) => b.mins));
        const top = [...blocks].sort((a, b) => b.mins - a.mins)[0];
        const chronotype =
          top && top.mins > 0
            ? top.id === "morning"
              ? "Chim sớm (Sáng tinh mơ hiệu quả nhất)"
              : top.id === "night"
              ? "Cú đêm (Tập trung sâu về khuya)"
              : top.id === "evening"
              ? "Chiến binh buổi tối"
              : "Nhịp sinh học cân bằng ban ngày"
            : "Chưa đủ dữ liệu nhịp sinh học";
        return (
          <section className="glass-card rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Biểu đồ Năng lượng & Nhịp sinh học
                </h3>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-medium text-[var(--accent)]">
                {chronotype}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                >
                  <div className="text-[11px] text-[var(--text-muted)]">{b.label}</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[var(--text-primary)]">
                    {b.mins}p
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.round((b.mins / maxB) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* BẢNG HUY HIỆU THÀNH TỰU */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t("achievementsTitle")}
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t("achievementsSub")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.title}
              className={cn(
                "card-lift rounded-xl border p-3.5",
                a.done
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] opacity-75"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">{a.title}</span>
                {a.done ? (
                  <Trophy className="h-4 w-4 text-amber-500" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                )}
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{a.desc}</p>
              <span
                className={cn(
                  "mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                  a.done
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                )}
              >
                {a.done ? t("unlocked") : t("locked")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
