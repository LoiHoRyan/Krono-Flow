"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Clock,
  Pause,
  Play,
  Plus,
  Radar,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { getLocalDateIso } from "@/lib/utils";
import { kfNotify } from "@/lib/notify";
import type { SubjectRecord, TodoItem } from "./SubjectTodoPanel";
import type { ExamRecord } from "./DashboardBento";
import type { GoalRecord } from "./GoalsTimeblockPanel";

interface PageBookmark {
  id: string;
  title: string;
  subjectName: string;
  currentPage: number;
  totalPages: number;
  updatedAt: string;
}

const BOOKMARK_KEY = "kronoflow-page-bookmarks-v1";
const CHOICES = ["A", "B", "C", "D"] as const;

function daysFromToday(isoDate: string): number {
  const todayStr = getLocalDateIso();
  const d1 = new Date(`${todayStr}T00:00:00`);
  const d2 = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d2.getTime())) return 999;
  return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
}

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function DeadlineRadarExamSimModal({
  open,
  onClose,
  subjects,
  todos,
  exams,
  goals,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectRecord[];
  todos: TodoItem[];
  exams: ExamRecord[];
  goals: GoalRecord[];
}) {
  const [tab, setTab] = useState<"radar" | "bookmarks" | "examsim">("radar");

  // TAB 1: Unified Deadline Radar
  const radarItems = useMemo(() => {
    const out: {
      id: string;
      kind: "Kỳ thi" | "Công việc" | "Mục tiêu";
      title: string;
      dateStr: string;
      daysLeft: number;
    }[] = [];

    for (const ex of exams) {
      const ds = ex.examDate.slice(0, 10);
      out.push({ id: `ex-${ex.id}`, kind: "Kỳ thi", title: ex.title, dateStr: ds, daysLeft: daysFromToday(ds) });
    }
    for (const td of todos) {
      if (!td.isCompleted && td.dueDate) {
        const ds = td.dueDate.slice(0, 10);
        out.push({ id: `td-${td.id}`, kind: "Công việc", title: td.title, dateStr: ds, daysLeft: daysFromToday(ds) });
      }
    }
    for (const gl of goals) {
      if (gl.deadline && gl.currentValue < gl.targetValue) {
        const ds = gl.deadline.slice(0, 10);
        out.push({ id: `gl-${gl.id}`, kind: "Mục tiêu", title: gl.title, dateStr: ds, daysLeft: daysFromToday(ds) });
      }
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [exams, todos, goals]);

  // TAB 2: Page Bookmark Tracker
  const [bookmarks, setBookmarks] = useState<PageBookmark[]>([]);
  const [bmTitle, setBmTitle] = useState("");
  const [bmSubj, setBmSubj] = useState("");
  const [bmCur, setBmCur] = useState(1);
  const [bmTotal, setBmTotal] = useState(100);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(BOOKMARK_KEY);
      if (raw) setBookmarks(JSON.parse(raw) as PageBookmark[]);
    } catch {
      // ignore
    }
  }, [open]);

  const saveBookmarks = (next: PageBookmark[]) => {
    setBookmarks(next);
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addBookmark = () => {
    if (!bmTitle.trim()) return;
    const item: PageBookmark = {
      id: `bm-${Date.now()}`,
      title: bmTitle.trim(),
      subjectName: bmSubj || "Chung",
      currentPage: Math.max(0, bmCur),
      totalPages: Math.max(1, bmTotal),
      updatedAt: getLocalDateIso(),
    };
    saveBookmarks([item, ...bookmarks]);
    setBmTitle("");
    setBmCur(1);
    kfNotify("Đã lưu mốc trang giáo trình!");
  };

  // TAB 3: Exam Room Simulator (45/60/90/120m + 50-question A/B/C/D answer sheet)
  const [simDurationMin, setSimDurationMin] = useState(60);
  const [simSecsLeft, setSimSecsLeft] = useState(60 * 60);
  const [simRunning, setSimRunning] = useState(false);
  const [qCount, setQCount] = useState(40);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!simRunning) return;
    const id = setInterval(() => {
      setSimSecsLeft((prev) => {
        const halfMark = Math.floor((simDurationMin * 60) / 2);
        if (prev === halfMark) {
          kfNotify("Đã đi qua 50% thời gian làm bài thi!", "info");
        }
        if (prev === 600) {
          kfNotify("Còn 10 phút cuối! Hãy rà soát lại phiếu đáp án.", "warn");
        }
        if (prev <= 1) {
          setSimRunning(false);
          kfNotify("Hết giờ làm bài thi thử!", "warn");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [simRunning, simDurationMin]);

  if (!open) return null;

  const answeredCount = Object.keys(answers).length;
  const totalSimSecs = Math.max(1, simDurationMin * 60);
  const simPct = Math.round((simSecsLeft / totalSimSecs) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Radar Hạn chót · Đánh dấu Trang · Phòng thi Bấm giờ</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Xếp hạng mọi deadline, lưu trang giáo trình đang đọc và mô phỏng phòng thi trắc nghiệm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("radar")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "radar" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Radar Hạn ({radarItems.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("bookmarks")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "bookmarks" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Trang sách ({bookmarks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("examsim")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "examsim" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Phòng thi thử
          </button>
        </div>

        {/* TAB 1: UNIFIED DEADLINE RADAR */}
        {tab === "radar" && (
          <div className="space-y-2">
            {radarItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                Tuyệt vời! Chưa có kỳ thi, công việc hay mục tiêu nào sắp đến hạn.
              </div>
            ) : (
              radarItems.map((it) => {
                const badgeCls =
                  it.daysLeft < 0
                    ? "bg-rose-500/15 text-rose-600"
                    : it.daysLeft === 0
                    ? "bg-rose-600 text-white"
                    : it.daysLeft <= 3
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : it.daysLeft <= 7
                    ? "bg-sky-500/15 text-sky-600"
                    : "bg-emerald-500/15 text-emerald-600";
                const badgeText =
                  it.daysLeft < 0
                    ? `Quá hạn ${Math.abs(it.daysLeft)} ngày`
                    : it.daysLeft === 0
                    ? "Hôm nay"
                    : `Còn ${it.daysLeft} ngày`;
                return (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                          {it.kind}
                        </span>
                        <span className="truncate font-semibold text-[var(--text-primary)]">{it.title}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">Hạn: {it.dateStr}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badgeCls}`}>
                      {badgeText}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: PAGE BOOKMARK TRACKER */}
        {tab === "bookmarks" && (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:grid-cols-4">
              <input
                value={bmTitle}
                onChange={(e) => setBmTitle(e.target.value)}
                placeholder="Tên giáo trình / Slide PDF..."
                className="sm:col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
              />
              <select
                value={bmSubj}
                onChange={(e) => setBmSubj(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs outline-none"
              >
                <option value="">Môn học chung</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addBookmark}
                className="btn-primary inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Lưu mốc
              </button>
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span>Đang ở trang:</span>
                <input
                  type="number"
                  min={0}
                  value={bmCur}
                  onChange={(e) => setBmCur(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span>Tổng trang:</span>
                <input
                  type="number"
                  min={1}
                  value={bmTotal}
                  onChange={(e) => setBmTotal(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
                />
              </label>
            </div>

            {bookmarks.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                Chưa có dấu trang tài liệu nào. Thêm giáo trình/slide ở trên để theo dõi trang đọc dở.
              </p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bm) => {
                  const pct = Math.min(100, Math.round((bm.currentPage / Math.max(1, bm.totalPages)) * 100));
                  return (
                    <div
                      key={bm.id}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{bm.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {bm.subjectName} · Cập nhật: {bm.updatedAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={bm.totalPages}
                            value={bm.currentPage}
                            onChange={(e) => {
                              const pg = Math.max(0, Math.min(bm.totalPages, Number(e.target.value) || 0));
                              saveBookmarks(
                                bookmarks.map((x) =>
                                  x.id === bm.id ? { ...x, currentPage: pg, updatedAt: getLocalDateIso() } : x
                                )
                              );
                            }}
                            className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-center font-mono text-xs font-bold"
                          />
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">/ {bm.totalPages}</span>
                          <button
                            type="button"
                            onClick={() => saveBookmarks(bookmarks.filter((x) => x.id !== bm.id))}
                            className="text-[var(--text-muted)] hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                          <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-[var(--accent)]">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXAM ROOM SIMULATOR */}
        {tab === "examsim" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-3xl font-extrabold tabular-nums text-[var(--accent)]">
                    {fmtClock(simSecsLeft)}
                  </span>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Đã tô: <strong>{answeredCount}/{qCount}</strong> câu
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSimRunning(false);
                        setSimDurationMin(m);
                        setSimSecsLeft(m * 60);
                      }}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                        simDurationMin === m
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                      }`}
                    >
                      {m}p
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSimRunning((v) => !v)}
                    className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold"
                  >
                    {simRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {simRunning ? "Tạm dừng" : "Bắt đầu thi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimRunning(false);
                      setSimSecsLeft(simDurationMin * 60);
                      setAnswers({});
                    }}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)]"
                    title="Làm lại bài thi thử"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <div
                  className={`h-full transition-all ${simPct <= 15 ? "bg-rose-500" : "bg-[var(--accent)]"}`}
                  style={{ width: `${simPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Phiếu tô nháp trắc nghiệm:</span>
              <select
                value={qCount}
                onChange={(e) => setQCount(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-xs font-semibold"
              >
                {[20, 30, 40, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} câu hỏi
                  </option>
                ))}
              </select>
            </div>

            <div className="grid max-h-60 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
              {Array.from({ length: qCount }, (_, i) => i + 1).map((qNum) => (
                <div
                  key={qNum}
                  className="flex items-center justify-between gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-2 py-1 text-[11px]"
                >
                  <span className="w-6 font-mono font-bold text-[var(--text-muted)]">{qNum}.</span>
                  <div className="flex gap-0.5">
                    {CHOICES.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [qNum]: prev[qNum] === ch ? "" : ch,
                          }))
                        }
                        className={`h-5 w-5 rounded text-[10px] font-bold transition ${
                          answers[qNum] === ch
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
