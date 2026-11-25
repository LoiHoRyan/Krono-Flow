"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BedDouble,
  Copy,
  Download,
  FileEdit,
  Grid2X2,
  Pause,
  Play,
  Plus,
  Presentation,
  RotateCcw,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { TodoItem } from "./SubjectTodoPanel";
import type { GradeRecord } from "./ScheduleGpaPanel";
import type { SessionLogItem } from "./PomodoroTimer";

interface ScholarshipItem {
  id: string;
  title: string;
  category: "Học bổng" | "Chứng chỉ" | "Dự án / Giải thưởng";
  deadline: string;
  minGpa4: number;
  status: "Đang chuẩn bị" | "Đã nộp" | "Đạt";
}

const SCHOLAR_KEY = "kronoflow-scholarships-v1";

function isConditionCourse(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("thể chất") || n.includes("quốc phòng") || n.includes("gdtc") || n.includes("gdqp");
}

export function ProStudySuiteModal({
  open,
  onClose,
  userName,
  todos,
  grades,
  sessions,
  flashcardCount,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  todos: TodoItem[];
  grades: GradeRecord[];
  sessions: SessionLogItem[];
  flashcardCount: number;
}) {
  const [tab, setTab] = useState<"teleprompter" | "eisenhower" | "essay" | "scholar" | "sleep">("teleprompter");

  // 1. Teleprompter
  const [scriptText, setScriptText] = useState(
    "Xin chào thầy cô và các bạn. Hôm nay nhóm chúng em xin trình bày đề tài nghiên cứu...\n\nPhần 1: Tổng quan bài toán và mục tiêu thực hiện.\nPhần 2: Kiến trúc hệ thống và kết quả thử nghiệm.\nPhần 3: Kết luận và hướng phát triển."
  );
  const [tpPlaying, setTpPlaying] = useState(false);
  const [tpSpeed, setTpSpeed] = useState(2);
  const [tpFontSize, setTpFontSize] = useState(20);
  const tpBoxRef = useRef<HTMLDivElement | null>(null);

  // 2. Essay Polish Helper
  const [essayText, setEssayText] = useState("");

  // 3. Scholarship & Portfolio Tracker
  const [scholars, setScholars] = useState<ScholarshipItem[]>([]);
  const [scTitle, setScTitle] = useState("");
  const [scCat, setScCat] = useState<ScholarshipItem["category"]>("Học bổng");
  const [scDue, setScDue] = useState("");
  const [scMinGpa, setScMinGpa] = useState("3.2");

  // 4. Sleep Cycle Calculator
  const [wakeTime, setWakeTime] = useState("06:30");

  useEffect(() => {
    if (!open) {
      setTpPlaying(false);
      return;
    }
    try {
      const raw = localStorage.getItem(SCHOLAR_KEY);
      if (raw) setScholars(JSON.parse(raw) as ScholarshipItem[]);
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!tpPlaying || !open || tab !== "teleprompter") return;
    const id = setInterval(() => {
      const el = tpBoxRef.current;
      if (el) el.scrollTop += tpSpeed;
    }, 45);
    return () => clearInterval(id);
  }, [tpPlaying, tpSpeed, open, tab]);

  // Exact unrounded linear CPA (excluding GDTC/GDQP)
  const currentCpa4 = useMemo(() => {
    const valid = grades.filter((g) => g.credits > 0 && g.score10 > 0 && !isConditionCourse(g.courseName));
    const cr = valid.reduce((a, b) => a + b.credits, 0);
    if (cr <= 0) return 0;
    const w4 = valid.reduce((a, b) => a + b.score10 * 0.4 * b.credits, 0);
    return Number((w4 / cr).toFixed(4));
  }, [grades]);

  // Eisenhower 4 Quadrants
  const quadrants = useMemo(() => {
    const nowMs = Date.now();
    const pending = todos.filter((t) => !t.isCompleted);
    const q1: TodoItem[] = [];
    const q2: TodoItem[] = [];
    const q3: TodoItem[] = [];
    const q4: TodoItem[] = [];
    for (const t of pending) {
      const dueMs = t.dueDate ? new Date(t.dueDate).getTime() : null;
      const urgent = Boolean(t.isUrgent || (dueMs !== null && dueMs - nowMs <= 3 * 86400000));
      const important = t.priority === "high" || t.priority === "medium";
      if (urgent && important) q1.push(t);
      else if (!urgent && important) q2.push(t);
      else if (urgent && !important) q3.push(t);
      else q4.push(t);
    }
    return { q1, q2, q3, q4 };
  }, [todos]);

  // Essay metrics
  const essayStats = useMemo(() => {
    const trimmed = essayText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const paras = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
    const sentences = trimmed
      ? trimmed
          .split(/[.!?]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const longSentences = sentences.filter((s) => s.split(/\s+/).length > 35);
    return { words, paras, sentenceCount: sentences.length, longSentences };
  }, [essayText]);

  // Sleep cycles
  const sleepSuggestions = useMemo(() => {
    const [hh, mm] = wakeTime.split(":").map(Number);
    const wakeMins = (hh ?? 6) * 60 + (mm ?? 30);
    return [6, 5, 4, 3].map((cycles) => {
      const totalMins = cycles * 90 + 15; // +15m fall asleep
      const bedMins = ((wakeMins - totalMins) % 1440 + 1440) % 1440;
      const bh = String(Math.floor(bedMins / 60)).padStart(2, "0");
      const bm = String(bedMins % 60).padStart(2, "0");
      return {
        cycles,
        hours: (cycles * 1.5).toFixed(1),
        bedTime: `${bh}:${bm}`,
        optimal: cycles === 5 || cycles === 6,
      };
    });
  }, [wakeTime]);

  if (!open) return null;

  const saveScholars = (next: ScholarshipItem[]) => {
    setScholars(next);
    try {
      localStorage.setItem(SCHOLAR_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const scriptWords = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const estSpeakMins = Math.max(0.5, Math.round((scriptWords / 130) * 10) / 10);

  const exportStudyCardPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cutoff = Date.now() - 7 * 86400000;
    const wkSessions = sessions.filter(
      (s) => s.status === "completed" && new Date(s.startedAt).getTime() >= cutoff
    );
    const wkHours = (wkSessions.reduce((a, b) => a + b.actualMinutes, 0) / 60).toFixed(1);

    const grad = ctx.createLinearGradient(0, 0, 900, 480);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 480);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(42, 42, 816, 396);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("KRONOFLOW · WEEKLY STUDY CERTIFICATE", 76, 98);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText(userName || "KronoFlow Student", 76, 156);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(`Tổng kết 7 ngày gần nhất · ${new Date().toLocaleDateString("vi-VN")}`, 76, 194);

    const cards = [
      { label: "GIỜ TẬP TRUNG TUẦN", val: `${wkHours}h` },
      { label: "PHIÊN HOÀN THÀNH", val: `${wkSessions.length}` },
      { label: "THẺ FLASHCARD", val: `${flashcardCount}` },
    ];
    cards.forEach((c, idx) => {
      const x = 76 + idx * 255;
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(x, 240, 232, 130);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(c.label, x + 20, 276);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px ui-monospace, monospace";
      ctx.fillText(c.val, x + 20, 338);
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-study-card-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Presentation className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Trợ lý Thuyết trình, Tiểu luận, Eisenhower, Học bổng & Ngủ 90p
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          {(
            [
              ["teleprompter", "Thuyết trình", Presentation],
              ["eisenhower", "Eisenhower", Grid2X2],
              ["essay", "Soát Tiểu luận", FileEdit],
              ["scholar", "Học bổng & CV", Award],
              ["sleep", "Ngủ 90p & Thẻ PNG", BedDouble],
            ] as const
          ).map(([k, lbl, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                tab === k
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {lbl}
            </button>
          ))}
        </div>

        {/* TAB 1: TELEPROMPTER */}
        {tab === "teleprompter" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">
                <strong>{scriptWords}</strong> từ · Thời lượng nói ước tính:{" "}
                <strong className="font-mono text-[var(--accent)]">~{estSpeakMins} phút</strong> (130 từ/phút)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-[11px]">
                  Tốc độ
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={tpSpeed}
                    onChange={(e) => setTpSpeed(Number(e.target.value))}
                    className="w-16 accent-[var(--accent)]"
                  />
                </label>
                <label className="flex items-center gap-1 text-[11px]">
                  Cỡ chữ
                  <input
                    type="range"
                    min={14}
                    max={32}
                    value={tpFontSize}
                    onChange={(e) => setTpFontSize(Number(e.target.value))}
                    className="w-16 accent-[var(--accent)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setTpPlaying((v) => !v)}
                  className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium"
                >
                  {tpPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {tpPlaying ? "Tạm dừng" : "Chạy nhắc chữ"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTpPlaying(false);
                    if (tpBoxRef.current) tpBoxRef.current.scrollTop = 0;
                  }}
                  className="rounded-lg border border-[var(--border-subtle)] p-1"
                  title="Cuộn về đầu"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div
              ref={tpBoxRef}
              style={{ fontSize: `${tpFontSize}px` }}
              className="h-44 overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1020] p-5 leading-relaxed text-slate-100 whitespace-pre-wrap"
            >
              {scriptText || "Dán kịch bản thuyết trình vào ô bên dưới..."}
            </div>

            <textarea
              rows={4}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Dán bài thuyết trình hoặc kịch bản bảo vệ đồ án vào đây..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
            />
          </div>
        )}

        {/* TAB 2: EISENHOWER 4 QUADRANTS */}
        {tab === "eisenhower" && (
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            {(
              [
                ["Q1 · Làm ngay (Khẩn cấp & Quan trọng)", quadrants.q1, "border-rose-500/40 bg-rose-500/5 text-rose-600"],
                ["Q2 · Lên lịch (Quan trọng, chưa gấp)", quadrants.q2, "border-sky-500/40 bg-sky-500/5 text-sky-600"],
                ["Q3 · Xử lý nhanh (Gấp, ưu tiên thấp)", quadrants.q3, "border-amber-500/40 bg-amber-500/5 text-amber-600"],
                ["Q4 · Để sau / Giảm bớt", quadrants.q4, "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)]"],
              ] as const
            ).map(([title, list, cls]) => (
              <div key={title} className={`rounded-xl border p-3.5 ${cls}`}>
                <div className="font-semibold">
                  {title} ({list.length})
                </div>
                {list.length === 0 ? (
                  <p className="mt-2 text-[11px] opacity-70">Không có công việc nào ở nhóm này.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-[var(--text-primary)]">
                    {list.slice(0, 6).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate">• {t.title}</span>
                        {t.dueDate && (
                          <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                            {t.dueDate.slice(5, 10)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: ESSAY POLISH HELPER */}
        {tab === "essay" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex flex-wrap gap-3 font-mono text-[11px]">
                <span>
                  Từ: <strong className="text-[var(--accent)]">{essayStats.words}</strong>
                </span>
                <span>
                  Câu: <strong>{essayStats.sentenceCount}</strong>
                </span>
                <span>
                  Đoạn: <strong>{essayStats.paras}</strong>
                </span>
                <span className={essayStats.longSentences.length > 0 ? "text-amber-600" : "text-emerald-600"}>
                  Câu dài (&gt;35 từ): <strong>{essayStats.longSentences.length}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setEssayText((t) =>
                      t
                        .replace(/[ \t]+/g, " ")
                        .replace(/ *\n */g, "\n")
                        .replace(/\s+([,.;:!?])/g, "$1")
                        .trim()
                    )
                  }
                  className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[11px] hover:border-[var(--accent)]"
                >
                  Xóa trắng thừa & Chuẩn dấu
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEssayText((t) =>
                      t.replace(/(^|\s)\S/g, (ch) => ch.toUpperCase())
                    )
                  }
                  className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[11px]"
                >
                  Title Case
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(essayText).catch(() => {});
                    window.alert("Đã sao chép văn bản đã làm sạch!");
                  }}
                  className="btn-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px]"
                >
                  <Copy className="h-3 w-3" /> Chép
                </button>
              </div>
            </div>
            <textarea
              rows={7}
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Dán đoạn tiểu luận hoặc báo cáo vào đây để kiểm tra độ dài câu, số từ và làm sạch khoảng trắng..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs leading-relaxed"
            />
          </div>
        )}

        {/* TAB 4: SCHOLARSHIP & CV PORTFOLIO */}
        {tab === "scholar" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-[11px]">
              CPA hệ 4 thực hiện tại của bạn:{" "}
              <strong className="font-mono text-[var(--accent)]">
                {currentCpa4 > 0 ? currentCpa4 : "Chưa có dữ liệu điểm"}
              </strong>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!scTitle.trim()) return;
                const item: ScholarshipItem = {
                  id: `${Date.now()}`,
                  title: scTitle.trim(),
                  category: scCat,
                  deadline: scDue || "Chưa đặt hạn",
                  minGpa4: Number(scMinGpa) || 0,
                  status: "Đang chuẩn bị",
                };
                saveScholars([item, ...scholars]);
                setScTitle("");
                setScDue("");
              }}
              className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-5"
            >
              <input
                type="text"
                required
                value={scTitle}
                onChange={(e) => setScTitle(e.target.value)}
                placeholder="Tên học bổng / Chứng chỉ / Dự án..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 sm:col-span-2"
              />
              <select
                value={scCat}
                onChange={(e) => setScCat(e.target.value as ScholarshipItem["category"])}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5"
              >
                <option value="Học bổng">Học bổng</option>
                <option value="Chứng chỉ">Chứng chỉ</option>
                <option value="Dự án / Giải thưởng">Dự án / Giải thưởng</option>
              </select>
              <input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={scMinGpa}
                onChange={(e) => setScMinGpa(e.target.value)}
                title="GPA tối thiểu (hệ 4)"
                placeholder="GPA ≥"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono"
              />
              <button type="submit" className="btn-primary inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Thêm
              </button>
            </form>

            <div className="space-y-2">
              {scholars.map((sc) => {
                const eligible = sc.minGpa4 <= 0 || currentCpa4 >= sc.minGpa4;
                return (
                  <div
                    key={sc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">{sc.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {sc.category} · Yêu cầu GPA ≥ {sc.minGpa4}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sc.minGpa4 > 0 && currentCpa4 > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            eligible
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {eligible ? "✓ Đủ điều kiện GPA" : `Cần +${(sc.minGpa4 - currentCpa4).toFixed(2)}`}
                        </span>
                      )}
                      <select
                        value={sc.status}
                        onChange={(e) =>
                          saveScholars(
                            scholars.map((x) =>
                              x.id === sc.id ? { ...x, status: e.target.value as ScholarshipItem["status"] } : x
                            )
                          )
                        }
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px]"
                      >
                        <option value="Đang chuẩn bị">Đang chuẩn bị</option>
                        <option value="Đã nộp">Đã nộp</option>
                        <option value="Đạt">Đạt ✓</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => saveScholars(scholars.filter((x) => x.id !== sc.id))}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: SLEEP CYCLE 90M & SHAREABLE STUDY CARD PNG */}
        {tab === "sleep" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                  <BedDouble className="h-4 w-4 text-indigo-500" />
                  Tính giờ đi ngủ theo Chu kỳ 90 phút (+15p vào giấc)
                </span>
                <label className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">Giờ dậy sáng mai:</span>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-semibold"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {sleepSuggestions.map((sg) => (
                  <div
                    key={sg.cycles}
                    className={`rounded-xl border p-3 text-center ${
                      sg.optimal
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                    }`}
                  >
                    <div className="font-mono text-lg font-bold text-[var(--text-primary)]">{sg.bedTime}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {sg.cycles} chu kỳ ({sg.hours}h)
                    </div>
                    {sg.optimal && (
                      <div className="mt-1 text-[10px] font-semibold text-emerald-600">Tối ưu</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-soft)] p-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                  <Share2 className="h-4 w-4 text-[var(--accent)]" />
                  Thẻ Thành tựu Tuần (Xuất ảnh PNG đẹp)
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Tạo ảnh tổng kết giờ tập trung 7 ngày, số phiên hoàn thành và bộ Flashcard để lưu kỷ niệm hoặc chia sẻ nhóm học.
                </p>
              </div>
              <button
                type="button"
                onClick={exportStudyCardPng}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" /> Tải Thẻ Thành tựu (.PNG)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
