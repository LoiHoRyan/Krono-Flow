"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  Compass,
  Globe2,
  MessageSquareText,
  Pause,
  Play,
  Plus,
  Printer,
  Rocket,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { ExamRecord } from "./DashboardBento";
import type { SubjectOption } from "./PomodoroTimer";

interface RubricItem {
  id: string;
  label: string;
  weightPct: number;
  score: number;
}

interface QaItem {
  id: string;
  subject: string;
  question: string;
  answer: string;
  resolved: boolean;
}

const QA_KEY = "kronoflow-office-qa-v1";

const WORLD_ZONES = [
  { label: "Việt Nam (TP.HCM / Hà Nội)", tz: "Asia/Ho_Chi_Minh" },
  { label: "UTC (Quốc tế / Coursera)", tz: "UTC" },
  { label: "Mỹ Đông (New York · EST/EDT)", tz: "America/New_York" },
  { label: "Mỹ Tây (Los Angeles · PST/PDT)", tz: "America/Los_Angeles" },
  { label: "Anh (London · GMT/BST)", tz: "Europe/London" },
  { label: "Nhật Bản / Hàn Quốc (JST/KST)", tz: "Asia/Tokyo" },
  { label: "Úc (Sydney · AEST)", tz: "Australia/Sydney" },
];

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function RubricQaWorldModal({
  open,
  onClose,
  exams,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  exams: ExamRecord[];
  subjects: SubjectOption[];
}) {
  const [tab, setTab] = useState<"kickstart" | "rubric" | "qa" | "examA4" | "world">("kickstart");

  // 1. 5-Minute Kickstart
  const [microStep, setMicroStep] = useState("Mở tài liệu chương hiện tại và đọc trọn 2 trang đầu tiên");
  const [kickSecs, setKickSecs] = useState(5 * 60);
  const [kickRunning, setKickRunning] = useState(false);

  // 2. Rubric Self-Grader
  const [rubric, setRubric] = useState<RubricItem[]>([
    { id: "r1", label: "Nội dung & kiến thức chuyên môn", weightPct: 40, score: 8.5 },
    { id: "r2", label: "Thiết kế Slide / Báo cáo", weightPct: 20, score: 9.0 },
    { id: "r3", label: "Kỹ năng thuyết trình & thời lượng", weightPct: 20, score: 8.5 },
    { id: "r4", label: "Trả lời câu hỏi phản biện (Q&A)", weightPct: 20, score: 8.0 },
  ]);

  // 3. Office-Hours Q&A Log
  const [qaList, setQaList] = useState<QaItem[]>([]);
  const [qaSub, setQaSub] = useState("");
  const [qaQ, setQaQ] = useState("");

  // 5. World Clock tick
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) {
      setKickRunning(false);
      return;
    }
    try {
      const raw = localStorage.getItem(QA_KEY);
      if (raw) setQaList(JSON.parse(raw) as QaItem[]);
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!kickRunning || !open) return;
    const id = setInterval(() => {
      setKickSecs((s) => {
        if (s <= 1) {
          setKickRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [kickRunning, open]);

  useEffect(() => {
    if (!open || tab !== "world") return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [open, tab]);

  if (!open) return null;

  const saveQa = (next: QaItem[]) => {
    setQaList(next);
    try {
      localStorage.setItem(QA_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const totalWeight = rubric.reduce((a, b) => a + b.weightPct, 0);
  const rubricScore10 =
    totalWeight > 0
      ? rubric.reduce((a, b) => a + b.score * b.weightPct, 0) / totalWeight
      : 0;
  const rubricScore4 = Number((rubricScore10 * 0.4).toFixed(4));

  const printExamScheduleA4 = () => {
    const sorted = [...exams].sort(
      (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
    );
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const rows = sorted
      .map((ex, i) => {
        const dt = new Date(ex.examDate);
        const dayStr = dt.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return `<tr><td>${i + 1}</td><td><strong>${escapeHtml(ex.title)}</strong></td><td>${escapeHtml(dayStr)}</td><td></td><td></td></tr>`;
      })
      .join("");
    win.document.write(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Lịch thi cá nhân — KronoFlow</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: system-ui, sans-serif; color: #111; font-size: 12px; }
  h1 { font-size: 18px; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; }
</style></head><body>
  <h1>LỊCH THI HỌC KỲ — KRONOFLOW</h1>
  <table>
    <thead><tr><th>STT</th><th>Môn thi</th><th>Ngày thi</th><th>Giờ &amp; Phòng thi</th><th>SBD / Ghi chú</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">Chưa có kỳ thi nào được thêm.</td></tr>'}</tbody>
  </table>
  <script>window.onload = () => window.print();</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="kf-modal-in max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Khởi động 5 phút, Chấm Rubric, Sổ hỏi GV, Lịch thi A4 & Giờ Thế giới
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
              ["kickstart", "Khởi động 5p", Rocket],
              ["rubric", "Chấm Rubric", CheckSquare],
              ["qa", "Sổ hỏi GV", MessageSquareText],
              ["examA4", "Lịch thi A4", Printer],
              ["world", "Múi giờ QT", Globe2],
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

        {/* TAB 1: 5-MINUTE ANTI-PROCRASTINATION KICKSTART */}
        {tab === "kickstart" && (
          <div className="mt-4 space-y-4 text-center text-xs">
            <p className="text-[var(--text-muted)]">
              Đang ngại bắt đầu? Chỉ cần cam kết làm <strong>đúng 5 phút</strong> một bước siêu nhỏ để phá vỡ sức ỳ!
            </p>
            <input
              type="text"
              value={microStep}
              onChange={(e) => setMicroStep(e.target.value)}
              placeholder="Bước nhỏ nhất bạn sẽ làm ngay bây giờ..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-center text-sm font-medium text-[var(--text-primary)]"
            />
            <div className="font-mono text-6xl font-bold text-[var(--accent)]">
              {String(Math.floor(kickSecs / 60)).padStart(2, "0")}:
              {String(kickSecs % 60).padStart(2, "0")}
            </div>
            <div className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.round(((300 - kickSecs) / 300) * 100)}%` }}
              />
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (kickSecs <= 0) setKickSecs(300);
                  setKickRunning((r) => !r);
                }}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2 font-medium"
              >
                {kickRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {kickRunning ? "Tạm dừng" : kickSecs === 0 ? "Chạy lại 5 phút" : "Bắt đầu 5 phút ngay"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKickRunning(false);
                  setKickSecs(300);
                }}
                className="rounded-xl border border-[var(--border-subtle)] p-2"
                title="Đặt lại 05:00"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RUBRIC SELF-GRADER */}
        {tab === "rubric" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-soft)] p-3.5">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Tổng điểm dự kiến theo Rubric</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Tổng trọng số hiện tại: <strong className="font-mono">{totalWeight}%</strong>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-2xl font-bold text-[var(--accent)]">
                  {rubricScore10.toFixed(2)} / 10
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">Hệ 4 thực: {rubricScore4}</div>
              </div>
            </div>

            <div className="space-y-2">
              {rubric.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5"
                >
                  <input
                    type="text"
                    value={r.label}
                    onChange={(e) =>
                      setRubric((prev) => prev.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))
                    }
                    className="min-w-[160px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1"
                  />
                  <label className="flex items-center gap-1 text-[11px]">
                    <span>Trọng số</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={r.weightPct}
                      onChange={(e) =>
                        setRubric((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, weightPct: Number(e.target.value) } : x))
                        )
                      }
                      className="w-14 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-1 font-mono"
                    />
                    <span>%</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px]">
                    <span>Điểm</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.25}
                      value={r.score}
                      onChange={(e) =>
                        setRubric((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, score: Number(e.target.value) } : x))
                        )
                      }
                      className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-1 font-mono font-bold text-[var(--accent)]"
                    />
                  </label>
                  {rubric.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRubric((prev) => prev.filter((x) => x.id !== r.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setRubric((prev) => [
                    ...prev,
                    { id: `r-${Date.now()}`, label: "Tiêu chí mới", weightPct: 10, score: 8 },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm tiêu chí chấm
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: OFFICE-HOURS Q&A LOG */}
        {tab === "qa" && (
          <div className="mt-4 space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!qaQ.trim()) return;
                saveQa([
                  {
                    id: `qa-${Date.now()}`,
                    subject: qaSub.trim() || "Chung",
                    question: qaQ.trim(),
                    answer: "",
                    resolved: false,
                  },
                  ...qaList,
                ]);
                setQaQ("");
              }}
              className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-4"
            >
              <input
                type="text"
                list="kronoflow-qa-subs"
                value={qaSub}
                onChange={(e) => setQaSub(e.target.value)}
                placeholder="Môn học..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <datalist id="kronoflow-qa-subs">
                {subjects.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
              <input
                type="text"
                required
                value={qaQ}
                onChange={(e) => setQaQ(e.target.value)}
                placeholder="Câu hỏi cần hỏi giảng viên trên lớp..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 sm:col-span-2"
              />
              <button type="submit" className="btn-primary rounded-lg px-3 py-1.5 font-medium">
                + Ghi câu hỏi
              </button>
            </form>

            <div className="space-y-2">
              {qaList.map((item) => (
                <div key={item.id} className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.resolved}
                        onChange={() =>
                          saveQa(qaList.map((x) => (x.id === item.id ? { ...x, resolved: !x.resolved } : x)))
                        }
                      />
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {item.subject}
                      </span>
                      <span className={item.resolved ? "line-through text-[var(--text-muted)]" : "font-semibold text-[var(--text-primary)]"}>
                        {item.question}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => saveQa(qaList.filter((x) => x.id !== item.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.answer}
                    onChange={(e) =>
                      saveQa(qaList.map((x) => (x.id === item.id ? { ...x, answer: e.target.value } : x)))
                    }
                    placeholder="Ghi câu trả lời của giảng viên vào đây..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PRINTABLE A4 EXAM SCHEDULE */}
        {tab === "examA4" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Phiếu Lịch thi In A4 ({exams.length} kỳ thi)
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Có sẵn cột trống điền Giờ thi, Phòng thi và Số báo danh để in dán bàn học.
                </p>
              </div>
              <button
                type="button"
                onClick={printExamScheduleA4}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium"
              >
                <Printer className="h-3.5 w-3.5" /> In / Lưu PDF Lịch thi A4
              </button>
            </div>
            {exams.length > 0 && (
              <div className="space-y-1.5">
                {[...exams]
                  .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                  .map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                    >
                      <span className="font-medium text-[var(--text-primary)]">{ex.title}</span>
                      <span className="font-mono text-[var(--accent)]">{ex.examDate.slice(0, 10)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WORLD STUDY CLOCK */}
        {tab === "world" && (
          <div className="mt-4 grid gap-2.5 text-xs sm:grid-cols-2">
            {WORLD_ZONES.map((z) => {
              let timeStr = "--:--";
              let dateStr = "";
              try {
                timeStr = new Intl.DateTimeFormat("vi-VN", {
                  timeZone: z.tz,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                }).format(now);
                dateStr = new Intl.DateTimeFormat("vi-VN", {
                  timeZone: z.tz,
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                }).format(now);
              } catch {
                // ignore
              }
              return (
                <div
                  key={z.tz}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{z.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{dateStr}</div>
                  </div>
                  <div className="font-mono text-base font-bold text-[var(--accent)]">{timeStr}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
