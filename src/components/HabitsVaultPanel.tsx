"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  FolderKanban,
  HeartHandshake,
  Plus,
  Sparkles,
  Trash2,
  BookOpen,
  Pin,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playUiTick } from "@/lib/ui-sounds";
import type { SubjectOption } from "./PomodoroTimer";

export interface HabitRecord {
  id: string;
  title: string;
  color: string;
  dates: string[];
}

export interface ResourceRecord {
  id: string;
  title: string;
  url: string;
  category: string;
  subjectId: string | null;
}

export interface BookRecord {
  id: string;
  title: string;
  author: string | null;
  currentPage: number;
  totalPages: number;
}

export interface ReflectionRecord {
  id: string;
  entryDate: string;
  mood: number;
  highlight: string;
  improvement: string | null;
}

const MOODS = [
  { val: 1, label: "Mệt mỏi", emoji: "😣" },
  { val: 2, label: "Hơi xao nhãng", emoji: "😕" },
  { val: 3, label: "Ổn định", emoji: "🙂" },
  { val: 4, label: "Tập trung tốt", emoji: "😊" },
  { val: 5, label: "Rất hiệu quả", emoji: "🔥" },
];

const HABIT_COLORS = ["#10b981", "#2563eb", "#d97706", "#e11d48", "#7c3aed"];

export function HabitsVaultPanel({
  subjects,
  habits,
  resources,
  reflections,
  books = [],
  onNotify,
  onRefresh,
}: {
  subjects: SubjectOption[];
  habits: HabitRecord[];
  resources: ResourceRecord[];
  reflections: ReflectionRecord[];
  books?: BookRecord[];
  onNotify: (msg: string) => void;
  onRefresh: () => void;
}) {
  const [habitTitle, setHabitTitle] = useState("");
  const [habitColor, setHabitColor] = useState(HABIT_COLORS[0] ?? "#10b981");

  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resCat, setResCat] = useState("Tài liệu");
  const [resSub, setResSub] = useState("");
  const [resFilter, setResFilter] = useState("Tất cả");
  const [resTagFilter, setResTagFilter] = useState("Tất cả");
  const [vaultQuery, setVaultQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [sleepMap, setSleepMap] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const rawS = localStorage.getItem("kronoflow-sleep-logs");
      if (rawS) setSleepMap(JSON.parse(rawS));
    } catch {
      // ignore
    }
  }, []);

  const setTodaySleep = (hrs: number) => {
    const next = { ...sleepMap, [todayKey]: hrs };
    setSleepMap(next);
    localStorage.setItem("kronoflow-sleep-logs", JSON.stringify(next));
  };
  const [vaultMeta, setVaultMeta] = useState<Record<string, { tags: string[]; pinned?: boolean }>>({});
  const VAULT_TAGS = ["Slide", "Đề cũ", "Video", "PDF", "Tóm tắt"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-vault-meta");
      if (raw) setVaultMeta(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const updateVaultMeta = (next: Record<string, { tags: string[]; pinned?: boolean }>) => {
    setVaultMeta(next);
    localStorage.setItem("kronoflow-vault-meta", JSON.stringify(next));
  };

  const toggleVaultPin = (id: string) => {
    const cur = vaultMeta[id] ?? { tags: [], pinned: false };
    updateVaultMeta({ ...vaultMeta, [id]: { ...cur, pinned: !cur.pinned } });
  };

  const toggleVaultTag = (id: string, tag: string) => {
    const cur = vaultMeta[id] ?? { tags: [], pinned: false };
    const tags = cur.tags.includes(tag) ? cur.tags.filter((x) => x !== tag) : [...cur.tags, tag];
    updateVaultMeta({ ...vaultMeta, [id]: { ...cur, tags } });
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRef = reflections.find((r) => r.entryDate === todayKey);
  const [mood, setMood] = useState(todayRef?.mood ?? 4);
  const [highlight, setHighlight] = useState(todayRef?.highlight ?? "");
  const [improvement, setImprovement] = useState(todayRef?.improvement ?? "");

  useEffect(() => {
    try {
      const dr = localStorage.getItem("kronoflow-draft-reflection");
      if (dr && !highlight && !improvement) {
        const parsed = JSON.parse(dr);
        if (parsed.h) setHighlight(parsed.h);
        if (parsed.i) setImprovement(parsed.i);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (highlight || improvement) {
      localStorage.setItem(
        "kronoflow-draft-reflection",
        JSON.stringify({ h: highlight, i: improvement })
      );
    }
  }, [highlight, improvement]);
  const [bookTitle, setBookTitle] = useState("");
  const [bookPages, setBookPages] = useState(250);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: bookTitle.trim(), totalPages: bookPages }),
    });
    if (res.ok) {
      setBookTitle("");
      onNotify("Đã thêm sách vào Kệ sách!");
      onRefresh();
    }
  };

  const stepBook = async (b: BookRecord, delta: number) => {
    const next = Math.min(b.totalPages, b.currentPage + delta);
    await fetch(`/api/books/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPage: next }),
    });
    onRefresh();
  };

  const deleteBook = async (id: string) => {
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    onRefresh();
  };

  // 7 ngày gần nhất cho Habit Grid
  const last7Days: { iso: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("vi-VN", { weekday: "short" }),
    });
  }

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: habitTitle.trim(), color: habitColor }),
    });
    if (res.ok) {
      setHabitTitle("");
      onNotify("Đã thêm thói quen mới!");
      onRefresh();
    }
  };

  const toggleHabitDate = async (habitId: string, logDate: string) => {
    const res = await fetch("/api/habits/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, logDate }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.checked) {
        playUiTick("check");
        onNotify("Tuyệt vời! Đã chấm hoàn thành thói quen.");
      }
      onRefresh();
    }
  };

  const deleteHabit = async (id: string) => {
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resUrl.trim()) return;
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: resTitle.trim(),
        url: resUrl.trim(),
        category: resCat,
        subjectId: resSub || null,
      }),
    });
    if (res.ok) {
      setResTitle("");
      setResUrl("");
      onNotify("Đã lưu tài liệu vào Kho lưu trữ!");
      onRefresh();
    } else {
      onNotify("URL cần bắt đầu bằng https:// hoặc http://");
    }
  };

  const deleteResource = async (id: string) => {
    await fetch(`/api/resources/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlight.trim()) return;
    const res = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryDate: todayKey,
        mood,
        highlight: highlight.trim(),
        improvement: improvement.trim() || undefined,
      }),
    });
    if (res.ok) {
      onNotify("Đã lưu nhật ký phản tư hôm nay!");
      onRefresh();
    }
  };

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      {/* 1. HABIT TRACKER 7 NGÀY */}
      <section className="glass-card card-lift rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Theo dõi Thói quen hàng ngày (Habit Tracker)
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Bấm vào từng ô ngày để chấm hoàn thành
          </span>
        </div>

        <form onSubmit={handleAddHabit} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={habitTitle}
            onChange={(e) => setHabitTitle(e.target.value)}
            placeholder="VD: Đọc sách 20 phút, Học 15 từ vựng, Uống đủ 2L nước..."
            className="min-w-[220px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <div className="flex items-center gap-1.5">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setHabitColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full",
                  habitColor === c &&
                    "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm thói quen
          </button>
        </form>

        <div className="mt-5 overflow-x-auto">
          {habits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
              Chưa có thói quen nào. Hãy tạo 2–3 thói quen nhỏ để duy trì kỷ luật mỗi ngày.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2 font-medium">Thói quen</th>
                  {last7Days.map((d) => (
                    <th key={d.iso} className="py-2 text-center font-medium">
                      <div>{d.label}</div>
                      <div className="font-mono text-[10px]">{d.iso.slice(8)}</div>
                    </th>
                  ))}
                  <th className="py-2 text-right font-medium">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {habits.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3 pr-3 font-medium text-[var(--text-primary)]">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: h.color }}
                        />
                        {h.title}
                      </span>
                    </td>
                    {last7Days.map((d) => {
                      const done = h.dates.includes(d.iso);
                      return (
                        <td key={d.iso} className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleHabitDate(h.id, d.iso)}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-xl border",
                              done
                                ? "animate-pop border-transparent text-white shadow-sm"
                                : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-transparent hover:border-[var(--accent)]"
                            )}
                            style={done ? { backgroundColor: h.color } : undefined}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteHabit(h.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="inline h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 2. KHO TÀI LIỆU HỌC TẬP */}
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Kho Tài liệu ({resources.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-1 text-[11px]">
              {["Tất cả", "Tài liệu", "Video", "Bài tập", "Công cụ"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setResFilter(cat)}
                  className={cn(
                    "rounded-lg px-2 py-0.5 font-medium",
                    resFilter === cat
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddResource} className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <input
              type="text"
              value={resTitle}
              onChange={(e) => setResTitle(e.target.value)}
              placeholder="Tên tài liệu / Video bài giảng..."
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <input
              type="url"
              value={resUrl}
              onChange={(e) => {
                const v = e.target.value;
                setResUrl(v);
                const lower = v.toLowerCase();
                if (lower.includes("youtube.com") || lower.includes("youtu.be")) setResCat("Video");
                else if (lower.includes("drive.google.com") || lower.includes("docs.google.com") || lower.endsWith(".pdf")) setResCat("Tài liệu");
                else if (lower.includes("github.com") || lower.includes("notion.so")) setResCat("Công cụ");
              }}
              placeholder="https://..."
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={resCat}
              onChange={(e) => setResCat(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="Tài liệu">Tài liệu / Slide</option>
              <option value="Video">Video bài giảng</option>
              <option value="Bài tập">Bài tập / Đề thi</option>
              <option value="Công cụ">Công cụ học tập</option>
            </select>
            <div className="flex gap-2">
              <select
                value={resSub}
                onChange={(e) => setResSub(e.target.value)}
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                <option value="">-- Môn học --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Lưu
              </button>
            </div>
          </form>

          <input
            type="text"
            value={vaultQuery}
            onChange={(e) => setVaultQuery(e.target.value)}
            placeholder="Tìm nhanh tên tài liệu hoặc liên kết..."
            className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Tag className="h-3 w-3 text-[var(--text-muted)]" />
            {["Tất cả", ...VAULT_TAGS].map((tg) => (
              <button
                key={tg}
                type="button"
                onClick={() => setResTagFilter(tg)}
                className={cn(
                  "rounded-full border px-2 py-0.5 transition-colors",
                  resTagFilter === tg
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {tg}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {resources.length === 0 ? (
              <li className="text-xs text-[var(--text-muted)]">
                Chưa có liên kết nào được lưu.
              </li>
            ) : (
              resources
                .filter((r) => resFilter === "Tất cả" || r.category === resFilter)
                .filter((r) => resTagFilter === "Tất cả" || (vaultMeta[r.id]?.tags ?? []).includes(resTagFilter))
                .filter((r) => !vaultQuery.trim() || r.title.toLowerCase().includes(vaultQuery.toLowerCase()) || r.url.toLowerCase().includes(vaultQuery.toLowerCase()))
                .map((r) => {
                const meta = vaultMeta[r.id] ?? { tags: [], pinned: false };
                const sub = r.subjectId ? subjectMap.get(r.subjectId) : undefined;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        <span className="truncate">{r.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5">
                          {r.category}
                        </span>
                        {sub && <span>{sub.name}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="hidden flex-wrap gap-1 sm:flex">
                        {VAULT_TAGS.slice(0, 3).map((tg) => (
                          <button
                            key={tg}
                            type="button"
                            onClick={() => toggleVaultTag(r.id, tg)}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px]",
                              meta.tags.includes(tg)
                                ? "bg-[var(--accent)] text-white"
                                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            )}
                          >
                            {tg}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleVaultPin(r.id)}
                        title="Ghim ra Dashboard"
                        className={cn(
                          "rounded p-1",
                          meta.pinned ? "text-amber-500" : "text-[var(--text-muted)] hover:text-amber-500"
                        )}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteResource(r.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
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

        {/* 3. NHẬT KÝ PHẢN TƯ CUỐI NGÀY */}
        <section className="privacy-sensitive glass-card card-lift rounded-2xl p-6 lg:col-span-5">
          {(() => {
            const vals = Object.values(sleepMap).slice(-7);
            const avgSleep = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
            const todaySleep = sleepMap[todayKey] ?? 0;
            return (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  Giấc ngủ đêm qua:{avgSleep ? ` (TB ${avgSleep}h)` : ""}
                </span>
                <div className="flex gap-1">
                  {([5, 6, 7, 8, 9] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTodaySleep(h)}
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono font-medium",
                        todaySleep === h
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Nhật ký Phản tư hôm nay
            </h3>
          </div>

          <form onSubmit={handleSaveReflection} className="mt-4 space-y-3">
            <div className="flex justify-between gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setMood(m.val)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 text-[10px]",
                    mood === m.val
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)]"
                  )}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder="Điều bạn làm tốt nhất hôm nay là gì?"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={2}
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              placeholder="1 điều nhỏ cần cải thiện vào ngày mai..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="btn-primary w-full rounded-xl py-2 text-xs font-medium"
            >
              Lưu nhật ký hôm nay
            </button>
          </form>

          {reflections.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
              <div className="text-[11px] font-medium text-[var(--text-muted)]">Gần đây</div>
              {reflections.slice(0, 3).map((ref) => {
                const m = MOODS.find((x) => x.val === ref.mood);
                return (
                  <div
                    key={ref.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="font-mono">{ref.entryDate}</span>
                      <span>
                        {m?.emoji} {m?.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--text-primary)]">{ref.highlight}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    
      {/* 4. KỆ SÁCH & NHẬT KÝ ĐỌC (READING TRACKER) */}
      <section className="glass-card card-lift p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Kệ Sách & Giáo trình đang đọc ({books.length})
          </h3>
        </div>
        <form onSubmit={handleAddBook} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="Tên sách / Giáo trình..."
            className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            min={1}
            value={bookPages}
            onChange={(e) => setBookPages(Number(e.target.value))}
            className="w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            title="Tổng số trang"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm sách
          </button>
        </form>

        {books.length > 0 && (
          <input
            type="text"
            value={bookQuery}
            onChange={(e) => setBookQuery(e.target.value)}
            placeholder="Tìm nhanh sách trên kệ..."
            className="mt-3 w-full max-w-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.filter((b) => !bookQuery.trim() || b.title.toLowerCase().includes(bookQuery.toLowerCase())).map((b) => {
            const pct = Math.min(100, Math.round((b.currentPage / Math.max(1, b.totalPages)) * 100));
            return (
              <div
                key={b.id}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{b.title}</span>
                  <button
                    type="button"
                    onClick={() => deleteBook(b.id)}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[var(--text-muted)]">
                  <span>Trang {b.currentPage} / {b.totalPages} ({pct}%)</span>
                  <span>
                    {b.currentPage >= b.totalPages
                      ? "Đã đọc xong ✓"
                      : `~${Math.max(1, Math.ceil((b.totalPages - b.currentPage) / 15))} ngày (15tr/ngày)`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div className="progress-sheen h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepBook(b, 10)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
                  >
                    +10 trang
                  </button>
                  <button
                    type="button"
                    onClick={() => stepBook(b, 25)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
                  >
                    +25 trang
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
