"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  Coffee,
  FileText,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import type { ExamRecord } from "./DashboardBento";
import type { NoteRecord } from "./NotesFlashcardsPanel";

const MILESTONE_KEY = "kronoflow-exam-731-v1";

const BREAK_STEPS = [
  { label: "Nhìn xa 6m để giãn cơ mắt", secs: 20 },
  { label: "Xoay nhẹ cổ, thả lỏng vai gáy", secs: 50 },
  { label: "Đứng dậy vươn vai & uống 1 ngụm nước", secs: 50 },
];

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shiftDateLabel(iso: string, deltaDays: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + deltaDays);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function MicroBreakExamMilestonesModal({
  open,
  onClose,
  exams,
  notes,
}: {
  open: boolean;
  onClose: () => void;
  exams: ExamRecord[];
  notes: NoteRecord[];
}) {
  const [tab, setTab] = useState<"break" | "milestones" | "counter">("break");

  // TAB 1: 2-Minute Guided Micro-Break
  const [breakSecs, setBreakSecs] = useState(120);
  const [breakRunning, setBreakRunning] = useState(false);

  useEffect(() => {
    if (!breakRunning || breakSecs <= 0) return;
    const id = setInterval(() => {
      setBreakSecs((prev) => {
        if (prev <= 1) {
          setBreakRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [breakRunning, breakSecs]);

  const elapsed = 120 - breakSecs;
  const activeStepIdx = elapsed < 20 ? 0 : elapsed < 70 ? 1 : 2;

  // TAB 2: Auto 7-3-1 Day Exam Milestones
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(MILESTONE_KEY);
      if (raw) setCheckedMap(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, [open]);

  const toggleCheck = (key: string) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(MILESTONE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // TAB 3: Word, Character & Speaking Time Counter
  const [sampleText, setSampleText] = useState("");
  const metrics = useMemo(() => {
    const trimmed = sampleText.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const chars = sampleText.length;
    const readMins = Math.max(0, Math.ceil(words / 200));
    const speakMins = words > 0 ? (words / 130).toFixed(1) : "0.0";
    return { words, chars, readMins, speakMins };
  }, [sampleText]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Coffee className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Nghỉ 2p · Mốc thi 7-3-1 · Đếm từ & Thời lượng nói</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Hồi sức giữa phiên học, chia mốc ôn thi ngược và tính thời gian thuyết trình
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
            onClick={() => setTab("break")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "break" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Coffee className="h-3.5 w-3.5" /> Nghỉ 2 phút
          </button>
          <button
            type="button"
            onClick={() => setTab("milestones")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "milestones" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <CalendarCheck2 className="h-3.5 w-3.5" /> Mốc thi 7-3-1
          </button>
          <button
            type="button"
            onClick={() => setTab("counter")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "counter" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Đếm từ / Nói
          </button>
        </div>

        {/* TAB 1: MICRO-BREAK */}
        {tab === "break" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-5 text-center">
              <span className="font-mono text-4xl font-extrabold tabular-nums text-[var(--accent)]">
                {fmtClock(breakSecs)}
              </span>
              <p className="mt-1.5 text-xs font-semibold text-[var(--text-primary)]">
                {breakSecs === 0
                  ? "Hoàn thành nghỉ giải lao! Sẵn sàng quay lại tập trung."
                  : BREAK_STEPS[activeStepIdx]?.label ?? "Thư giãn nhẹ nhàng"}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBreakRunning((v) => !v)}
                  className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
                >
                  {breakRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {breakRunning ? "Tạm dừng" : "Bắt đầu nghỉ 2p"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBreakRunning(false);
                    setBreakSecs(120);
                  }}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {BREAK_STEPS.map((st, idx) => (
                <div
                  key={st.label}
                  className={`rounded-xl border p-3 text-xs transition ${
                    idx === activeStepIdx && breakRunning
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/50 font-semibold"
                      : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase text-[var(--accent)]">
                    Bước {idx + 1} · {st.secs}s
                  </p>
                  <p className="mt-1 text-[var(--text-primary)]">{st.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: 7-3-1 EXAM MILESTONES */}
        {tab === "milestones" && (
          <div className="space-y-3">
            {exams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                Chưa có kỳ thi nào. Thêm kỳ thi ở tab <strong>Tổng quan</strong> hoặc <strong>Lịch & Điểm</strong> để tự động tạo mốc D-7 / D-3 / D-1.
              </div>
            ) : (
              exams.map((ex) => {
                const steps = [
                  { k: `${ex.id}-d7`, tag: `D-7 (${shiftDateLabel(ex.examDate, -7)})`, label: "Tổng hợp đề cương, slide & gạch đầu dòng trọng tâm" },
                  { k: `${ex.id}-d3`, tag: `D-3 (${shiftDateLabel(ex.examDate, -3)})`, label: "Giải đề mẫu bấm giờ & chốt sổ lỗi sai" },
                  { k: `${ex.id}-d1`, tag: `D-1 (${shiftDateLabel(ex.examDate, -1)})`, label: "Rà lại công thức, chuẩn bị thẻ SV & ngủ đủ giấc" },
                ];
                return (
                  <div
                    key={ex.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3.5"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{ex.title}</p>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--accent)]">
                        Thi: {shiftDateLabel(ex.examDate, 0)}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {steps.map((st) => {
                        const done = Boolean(checkedMap[st.k]);
                        return (
                          <button
                            key={st.k}
                            type="button"
                            onClick={() => toggleCheck(st.k)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                              done
                                ? "bg-emerald-500/10 text-emerald-700 line-through dark:text-emerald-300"
                                : "bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)]/40"
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3.5 w-3.5 shrink-0 ${done ? "text-emerald-500" : "text-[var(--text-muted)]"}`}
                            />
                            <span className="shrink-0 font-mono text-[10px] font-bold text-[var(--accent)]">
                              {st.tag}
                            </span>
                            <span className="flex-1">{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: WORD & SPEAKING TIME COUNTER */}
        {tab === "counter" && (
          <div className="space-y-3">
            {notes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">Nạp từ ghi chú:</span>
                {notes.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSampleText(n.content)}
                    className="max-w-[160px] truncate rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[10px] font-semibold hover:border-[var(--accent)]"
                  >
                    {n.title}
                  </button>
                ))}
              </div>
            )}

            <textarea
              rows={7}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Dán đoạn tiểu luận, báo cáo hoặc kịch bản thuyết trình vào đây để đếm số từ và ước lượng thời gian nói..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs outline-none focus:border-[var(--accent)]"
            />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-center">
                <p className="text-[10px] text-[var(--text-muted)]">Số từ</p>
                <p className="font-mono text-base font-bold text-[var(--accent)]">{metrics.words}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-center">
                <p className="text-[10px] text-[var(--text-muted)]">Số ký tự</p>
                <p className="font-mono text-base font-bold">{metrics.chars}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-center">
                <p className="text-[10px] text-[var(--text-muted)]">Đọc thầm (~200t/p)</p>
                <p className="font-mono text-base font-bold">{metrics.readMins} phút</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-2.5 text-center">
                <p className="text-[10px] text-[var(--text-muted)]">Thuyết trình (~130t/p)</p>
                <p className="font-mono text-base font-bold text-emerald-600">{metrics.speakMins} phút</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
