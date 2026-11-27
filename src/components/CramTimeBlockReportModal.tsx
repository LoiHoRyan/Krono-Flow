"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Flame,
  Play,
  Printer,
  RotateCcw,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { SubjectRecord, TodoItem } from "./SubjectTodoPanel";
import type { FlashcardRecord, MistakeRecord } from "./NotesFlashcardsPanel";
import type { SessionLogItem } from "./PomodoroTimer";
import type { GradeRecord } from "./ScheduleGpaPanel";

interface DailyBlockEntry {
  hour: number;
  subjectName: string;
  task: string;
  color: string;
}

const TIMEBLOCK_KEY = "kronoflow-daily-timeblocks-v1";
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 -> 23:00

function fmtMinSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CramTimeBlockReportModal({
  open,
  onClose,
  userName,
  subjects,
  flashcards,
  mistakes,
  sessions,
  todos,
  grades,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  subjects: SubjectRecord[];
  flashcards: FlashcardRecord[];
  mistakes: MistakeRecord[];
  sessions: SessionLogItem[];
  todos: TodoItem[];
  grades: GradeRecord[];
}) {
  const [tab, setTab] = useState<"sprint" | "timeblock" | "report">("sprint");

  // TAB 1: 15-Minute Active Recall Sprint
  const sprintDeck = useMemo(() => {
    const items: { id: string; tag: string; front: string; back: string }[] = [];
    for (const m of mistakes) {
      if (!m.resolved) {
        items.push({
          id: `m-${m.id}`,
          tag: "Lỗi sai chưa sửa",
          front: m.question || "Câu hỏi lỗi sai",
          back: m.solution || m.reason || "Xem lại lý thuyết phần này",
        });
      }
    }
    for (const fc of flashcards) {
      if ((fc.mastery ?? 0) <= 2) {
        items.push({
          id: `fc-${fc.id}`,
          tag: "Flashcard cần ôn",
          front: fc.front,
          back: fc.back,
        });
      }
    }
    if (items.length === 0) {
      for (const fc of flashcards.slice(0, 20)) {
        items.push({
          id: `fc-all-${fc.id}`,
          tag: "Flashcard ôn nhanh",
          front: fc.front,
          back: fc.back,
        });
      }
    }
    return items.slice(0, 30);
  }, [flashcards, mistakes]);

  const [sprintRunning, setSprintRunning] = useState(false);
  const [sprintSecs, setSprintSecs] = useState(15 * 60);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);

  useEffect(() => {
    if (!sprintRunning || sprintSecs <= 0) return;
    const id = setInterval(() => {
      setSprintSecs((prev) => {
        if (prev <= 1) {
          setSprintRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sprintRunning, sprintSecs]);

  // TAB 2: Daily 24h Time-Blocking
  const [blocks, setBlocks] = useState<Record<number, DailyBlockEntry>>({});
  const [selectedHour, setSelectedHour] = useState<number>(19);
  const [blockSubj, setBlockSubj] = useState<string>("");
  const [blockTask, setBlockTask] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(TIMEBLOCK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DailyBlockEntry>;
        if (parsed && typeof parsed === "object") {
          const clean: Record<number, DailyBlockEntry> = {};
          for (const [k, v] of Object.entries(parsed)) {
            const h = Number(k);
            if (Number.isInteger(h) && v && typeof v.task === "string") {
              clean[h] = v;
            }
          }
          setBlocks(clean);
        }
      }
    } catch {
      // ignore
    }
  }, [open]);

  const saveBlocks = (next: Record<number, DailyBlockEntry>) => {
    setBlocks(next);
    try {
      localStorage.setItem(TIMEBLOCK_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const assignBlock = () => {
    const subjObj = subjects.find((s) => s.name === blockSubj);
    const label = blockSubj.trim() || "Tự học tập trung";
    const taskText = blockTask.trim() || "Ôn bài & làm bài tập";
    const next = {
      ...blocks,
      [selectedHour]: {
        hour: selectedHour,
        subjectName: label,
        task: taskText,
        color: subjObj?.color ?? "#6366f1",
      },
    };
    saveBlocks(next);
    setBlockTask("");
  };

  // TAB 3: Weekly Study Report (Markdown + Print A4)
  const [copiedMd, setCopiedMd] = useState(false);

  const weeklyStats = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const recentSessions = sessions.filter(
      (s) => s.status === "completed" && now - new Date(s.startedAt).getTime() <= sevenDaysMs
    );
    const totalMins = recentSessions.reduce((acc, s) => acc + s.actualMinutes, 0);
    const doneTodos = todos.filter((t) => t.isCompleted);
    const openTodos = todos.filter((t) => !t.isCompleted);
    const subjMap = new Map<string, number>();
    for (const s of recentSessions) {
      const name = subjects.find((x) => x.id === s.subjectId)?.name ?? "Tự học chung";
      subjMap.set(name, (subjMap.get(name) ?? 0) + s.actualMinutes);
    }
    const bySubject = Array.from(subjMap.entries()).sort((a, b) => b[1] - a[1]);
    return { totalMins, sessionCount: recentSessions.length, doneTodos, openTodos, bySubject };
  }, [sessions, todos, subjects]);

  const weeklyMarkdown = useMemo(() => {
    const today = new Date().toLocaleDateString("vi-VN");
    const hrs = (weeklyStats.totalMins / 60).toFixed(1);
    const subjLines =
      weeklyStats.bySubject.length > 0
        ? weeklyStats.bySubject.map(([n, m]) => `- **${n}**: ${m} phút (${(m / 60).toFixed(1)} giờ)`).join("\n")
        : "- Chưa ghi nhận phiên học theo môn trong 7 ngày qua.";
    const doneLines =
      weeklyStats.doneTodos.slice(0, 12).length > 0
        ? weeklyStats.doneTodos
            .slice(0, 12)
            .map((t) => `- [x] ${t.title}`)
            .join("\n")
        : "- Chưa có công việc hoàn thành.";

    return [
      `# Báo cáo Học tập Tuần — ${userName}`,
      `Ngày xuất: ${today}`,
      "",
      "## 1. Tổng quan 7 ngày gần nhất",
      `- Tổng thời gian tập trung: **${weeklyStats.totalMins} phút (${hrs} giờ)** qua ${weeklyStats.sessionCount} phiên.`,
      `- Công việc đã hoàn thành: **${weeklyStats.doneTodos.length}** | Đang mở: **${weeklyStats.openTodos.length}**.`,
      `- Tổng số môn đang theo dõi: **${subjects.length}** | Bản ghi điểm: **${grades.length}**.`,
      "",
      "## 2. Phân bổ thời gian theo môn học",
      subjLines,
      "",
      "## 3. Công việc nổi bật đã hoàn thành",
      doneLines,
    ].join("\n");
  }, [weeklyStats, userName, subjects.length, grades.length]);

  const handleCopyMd = () => {
    navigator.clipboard?.writeText(weeklyMarkdown).catch(() => {});
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([weeklyMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-weekly-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const activeCard = sprintDeck[cardIdx] ?? null;
  const scheduledCount = Object.keys(blocks).length;

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
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Ôn cấp tốc 15p · Time-Blocking · Báo cáo Tuần</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Luyện nhớ chủ động, khóa khung giờ học trong ngày và xuất báo cáo A4/Markdown
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

        {/* 3 Tabs */}
        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("sprint")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "sprint" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Flame className="h-3.5 w-3.5" /> Ôn cấp tốc 15p
          </button>
          <button
            type="button"
            onClick={() => setTab("timeblock")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "timeblock" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5" /> Time-Blocking
          </button>
          <button
            type="button"
            onClick={() => setTab("report")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "report" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Báo cáo Tuần
          </button>
        </div>

        {/* TAB 1: ACTIVE RECALL SPRINT */}
        {tab === "sprint" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-elevated)] px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold tabular-nums text-[var(--accent)]">
                  {fmtMinSec(sprintSecs)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Đã thuộc: <strong>{knownIds.length}</strong>/{sprintDeck.length} thẻ
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSprintRunning((v) => !v)}
                  className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <Play className="h-3.5 w-3.5" /> {sprintRunning ? "Tạm dừng" : "Bắt đầu 15p"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSprintRunning(false);
                    setSprintSecs(15 * 60);
                    setCardIdx(0);
                    setFlipped(false);
                    setKnownIds([]);
                  }}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Đặt lại phiên ôn"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {activeCard ? (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-5">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-bold text-[var(--accent)]">
                    {activeCard.tag}
                  </span>
                  <span className="font-mono text-[var(--text-muted)]">
                    Thẻ {cardIdx + 1} / {sprintDeck.length}
                  </span>
                </div>
                <p className="min-h-[64px] whitespace-pre-wrap text-sm font-semibold text-[var(--text-primary)]">
                  {activeCard.front}
                </p>

                {flipped ? (
                  <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-surface)] p-3.5">
                    <p className="mb-1 text-[10px] font-bold uppercase text-[var(--accent)]">Đáp án / Cách sửa</p>
                    <p className="whitespace-pre-wrap text-xs text-[var(--text-secondary)]">{activeCard.back}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="mt-4 w-full rounded-xl border border-dashed border-[var(--accent)] py-2.5 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  >
                    Lật xem đáp án
                  </button>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setCardIdx((i) => (i + 1) % sprintDeck.length);
                    }}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold hover:border-amber-500"
                  >
                    Chưa nhớ (Ôn lại)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKnownIds((prev) => (prev.includes(activeCard.id) ? prev : [...prev, activeCard.id]));
                      setFlipped(false);
                      setCardIdx((i) => (i + 1) % sprintDeck.length);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Đã nhớ
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                Chưa có Flashcard hoặc Lỗi sai nào để ôn cấp tốc. Hãy thêm vài thẻ trong mục <strong>Kiến thức</strong> trước nhé.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIME-BLOCKING 06:00 - 23:00 */}
        {tab === "timeblock" && (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:grid-cols-4">
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00 – {String(h + 1).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <select
                value={blockSubj}
                onChange={(e) => setBlockSubj(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">Tự học tập trung</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                value={blockTask}
                onChange={(e) => setBlockTask(e.target.value)}
                placeholder="Nội dung khung giờ..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={assignBlock}
                className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                Gắn khung giờ
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                Đã khóa <strong>{scheduledCount}</strong> giờ · Còn trống <strong>{HOURS.length - scheduledCount}</strong> giờ
              </span>
              {scheduledCount > 0 && (
                <button
                  type="button"
                  onClick={() => saveBlocks({})}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Xóa hết hôm nay
                </button>
              )}
            </div>

            <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {HOURS.map((h) => {
                const entry = blocks[h];
                return (
                  <div
                    key={h}
                    onClick={() => setSelectedHour(h)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                      selectedHour === h
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]/40"
                        : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 hover:border-[var(--accent)]/40"
                    }`}
                  >
                    <span className="w-12 shrink-0 font-mono text-[11px] font-bold text-[var(--text-muted)]">
                      {String(h).padStart(2, "0")}:00
                    </span>
                    {entry ? (
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold" style={{ color: entry.color }}>
                          {entry.subjectName}
                        </p>
                        <p className="truncate text-[11px] text-[var(--text-secondary)]">{entry.task}</p>
                      </div>
                    ) : (
                      <span className="flex-1 text-[11px] italic text-[var(--text-muted)]">Trống</span>
                    )}
                    {entry && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const copy = { ...blocks };
                          delete copy[h];
                          saveBlocks(copy);
                        }}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: WEEKLY REPORT A4 / MARKDOWN */}
        {tab === "report" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-bold text-[var(--accent)]">
                  {weeklyStats.totalMins} phút / 7 ngày
                </span>
                <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-600">
                  {weeklyStats.doneTodos.length} việc xong
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyMd}
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
                >
                  <Copy className="h-3.5 w-3.5" /> {copiedMd ? "Đã sao chép!" : "Chép Markdown"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMd}
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
                >
                  <Download className="h-3.5 w-3.5" /> Tải .md
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <Printer className="h-3.5 w-3.5" /> In A4
                </button>
              </div>
            </div>

            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">
              {weeklyMarkdown}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
