"use client";

import { getLocalDateIso } from "@/lib/utils";

import { kfNotify } from "@/lib/notify";

import { useEffect, useState } from "react";
import {
  Calculator,
  CalendarCheck2,
  ClipboardCheck,
  Columns3,
  Copy,
  FileText,
  Moon,
  Plus,
  Printer,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";
import type { MistakeRecord, NoteRecord } from "./NotesFlashcardsPanel";
import type { ExamRecord } from "./DashboardBento";

type QStatus = "none" | "right" | "wrong" | "review";

interface ProblemSet {
  id: string;
  title: string;
  total: number;
  statuses: QStatus[];
}

interface ComparisonRow {
  id: string;
  criterion: string;
  colA: string;
  colB: string;
}

interface ComparisonTable {
  id: string;
  title: string;
  nameA: string;
  nameB: string;
  rows: ComparisonRow[];
}

interface AbsenceEntry {
  totalSessions: number;
  absentCount: number;
}

interface ShutdownEntry {
  date: string;
  done: string;
  blocker: string;
  firstTomorrow: string;
}

interface FormulaItem {
  id: string;
  subjectName: string;
  title: string;
  body: string;
}

const PROB_KEY = "kronoflow-problem-sets-v1";
const COMP_KEY = "kronoflow-comparisons-v1";
const SPACED_KEY = "kronoflow-spaced-exam-v1";
const ABSENCE_KEY = "kronoflow-absence-guard-v1";
const SHUTDOWN_KEY = "kronoflow-daily-shutdown-v1";
const FORMULAS_KEY = "kronoflow-formulas-v1";

function letterFrom10(s10: number): string {
  if (s10 >= 9.0) return "A+";
  if (s10 >= 8.5) return "A";
  if (s10 >= 8.0) return "B+";
  if (s10 >= 7.0) return "B";
  if (s10 >= 6.5) return "C+";
  if (s10 >= 5.5) return "C";
  if (s10 >= 5.0) return "D+";
  if (s10 >= 4.0) return "D";
  return "F";
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function ExamToolkitModal({
  open,
  onClose,
  subjects,
  notes,
  mistakes,
  exams,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  notes: NoteRecord[];
  mistakes: MistakeRecord[];
  exams: ExamRecord[];
}) {
  const [tab, setTab] = useState<"crib" | "problems" | "compare" | "guard" | "shutdown">("crib");

  // 1. One-Page A4 Crib Sheet
  const [cribSubjectId, setCribSubjectId] = useState("");
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);

  // 2. Problem Set Tracker
  const [problemSets, setProblemSets] = useState<ProblemSet[]>([]);
  const [psTitle, setPsTitle] = useState("");
  const [psCount, setPsCount] = useState(30);
  const [psOnlyWrong, setPsOnlyWrong] = useState(false);

  // 3. Comparison Matrix
  const [comparisons, setComparisons] = useState<ComparisonTable[]>([]);
  const [cmpTitle, setCmpTitle] = useState("");
  const [cmpA, setCmpA] = useState("");
  const [cmpB, setCmpB] = useState("");
  const [critLabel, setCritLabel] = useState("");
  const [critA, setCritA] = useState("");
  const [critB, setCritB] = useState("");
  const [activeCmpId, setActiveCmpId] = useState<string | null>(null);

  // 4. Spaced Exam Checklist + Absence Guard
  const [spacedDone, setSpacedDone] = useState<Record<string, boolean>>({});
  const [absenceMap, setAbsenceMap] = useState<Record<string, AbsenceEntry>>({});

  // 5. 3-Line Daily Shutdown + Quick Converter
  const [shutdowns, setShutdowns] = useState<ShutdownEntry[]>([]);
  const [sdDone, setSdDone] = useState("");
  const [sdBlocker, setSdBlocker] = useState("");
  const [sdTomorrow, setSdTomorrow] = useState("");
  const [conv10, setConv10] = useState("9.3");
  const [paceTotal, setPaceTotal] = useState(120);
  const [paceDays, setPaceDays] = useState(10);

  useEffect(() => {
    if (!open) return;
    try {
      const fRaw = localStorage.getItem(FORMULAS_KEY);
      if (fRaw) setFormulas(JSON.parse(fRaw) as FormulaItem[]);
      const pRaw = localStorage.getItem(PROB_KEY);
      if (pRaw) setProblemSets(JSON.parse(pRaw) as ProblemSet[]);
      const cRaw = localStorage.getItem(COMP_KEY);
      if (cRaw) setComparisons(JSON.parse(cRaw) as ComparisonTable[]);
      const sRaw = localStorage.getItem(SPACED_KEY);
      if (sRaw) setSpacedDone(JSON.parse(sRaw) as Record<string, boolean>);
      const aRaw = localStorage.getItem(ABSENCE_KEY);
      if (aRaw) setAbsenceMap(JSON.parse(aRaw) as Record<string, AbsenceEntry>);
      const dRaw = localStorage.getItem(SHUTDOWN_KEY);
      if (dRaw) setShutdowns(JSON.parse(dRaw) as ShutdownEntry[]);
    } catch {
      // ignore
    }
  }, [open]);

  if (!open) return null;

  const saveJson = (key: string, data: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  // --- Crib Sheet helpers ---
  const selectedSub = subjects.find((s) => s.id === cribSubjectId) ?? null;
  const cribNotes = selectedSub ? notes.filter((n) => n.subjectId === selectedSub.id) : notes.slice(0, 4);
  const cribMistakes = (selectedSub ? mistakes.filter((m) => m.subjectId === selectedSub.id) : mistakes).filter(
    (m) => !m.resolved
  );
  const cribFormulas = selectedSub
    ? formulas.filter((f) => f.subjectName.toLowerCase().includes(selectedSub.name.toLowerCase()))
    : formulas;

  const printCribSheetA4 = () => {
    const title = selectedSub ? `Phiếu Ôn thi A4 — ${selectedSub.name}` : "Phiếu Ôn thi Tóm tắt A4 — KronoFlow";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #111; font-size: 11px; line-height: 1.45; }
  h1 { font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #111; padding-bottom: 4px; }
  h2 { font-size: 12px; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 0.04em; color: #1d4ed8; }
  .cols { column-count: 2; column-gap: 16px; }
  .card { break-inside: avoid; border: 1px solid #d4d4d8; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; }
  pre { margin: 4px 0 0; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 10.5px; background: #f4f4f5; padding: 4px; border-radius: 4px; }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <div class="cols">
    ${
      cribFormulas.length > 0
        ? `<h2>Công thức & Định lý (${cribFormulas.length})</h2>` +
          cribFormulas
            .map((f) => `<div class="card"><strong>${escapeHtml(f.title)}</strong><pre>${escapeHtml(f.body)}</pre></div>`)
            .join("")
        : ""
    }
    ${
      cribMistakes.length > 0
        ? `<h2>Lỗi sai cần tránh (${cribMistakes.length})</h2>` +
          cribMistakes
            .map(
              (m) =>
                `<div class="card"><strong>${escapeHtml(m.question)}</strong><div>→ ${escapeHtml(m.solution)}</div></div>`
            )
            .join("")
        : ""
    }
    ${
      cribNotes.length > 0
        ? `<h2>Ghi chú trọng tâm (${cribNotes.length})</h2>` +
          cribNotes
            .map(
              (n) =>
                `<div class="card"><strong>${escapeHtml(n.title)}</strong><div>${escapeHtml(n.content.slice(0, 380))}</div></div>`
            )
            .join("")
        : ""
    }
  </div>
  <script>window.onload = () => window.print();</script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  // --- Problem Set helpers ---
  const cycleStatus = (cur: QStatus): QStatus =>
    cur === "none" ? "right" : cur === "right" ? "wrong" : cur === "wrong" ? "review" : "none";

  const addProblemSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!psTitle.trim()) return;
    const total = Math.min(100, Math.max(5, psCount));
    const item: ProblemSet = {
      id: `${Date.now()}`,
      title: psTitle.trim(),
      total,
      statuses: Array.from({ length: total }, () => "none"),
    };
    const next = [item, ...problemSets];
    setProblemSets(next);
    saveJson(PROB_KEY, next);
    setPsTitle("");
  };

  // --- Comparison helpers ---
  const activeCmp = comparisons.find((c) => c.id === activeCmpId) ?? comparisons[0] ?? null;

  const addComparison = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmpTitle.trim() || !cmpA.trim() || !cmpB.trim()) return;
    const item: ComparisonTable = {
      id: `${Date.now()}`,
      title: cmpTitle.trim(),
      nameA: cmpA.trim(),
      nameB: cmpB.trim(),
      rows: [],
    };
    const next = [item, ...comparisons];
    setComparisons(next);
    saveJson(COMP_KEY, next);
    setActiveCmpId(item.id);
    setCmpTitle("");
    setCmpA("");
    setCmpB("");
  };

  const addComparisonRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCmp || !critLabel.trim()) return;
    const row: ComparisonRow = {
      id: `${Date.now()}`,
      criterion: critLabel.trim(),
      colA: critA.trim() || "—",
      colB: critB.trim() || "—",
    };
    const next = comparisons.map((c) => (c.id === activeCmp.id ? { ...c, rows: [...c.rows, row] } : c));
    setComparisons(next);
    saveJson(COMP_KEY, next);
    setCritLabel("");
    setCritA("");
    setCritB("");
  };

  const conv10Num = Number(conv10);
  const conv4Exact = !isNaN(conv10Num) ? Number((Math.min(10, Math.max(0, conv10Num)) * 0.4).toFixed(6)) : 0;

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
            <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Bộ công cụ Ôn thi & Thực chiến Đại học
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
              ["crib", "Phiếu A4", FileText],
              ["problems", "Làm đề", ClipboardCheck],
              ["compare", "So sánh", Columns3],
              ["guard", "Ôn D-14 & Điểm danh", ShieldAlert],
              ["shutdown", "Chốt ngày & Quy đổi", Moon],
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

        {/* TAB 1: ONE-PAGE A4 CRIB SHEET */}
        {tab === "crib" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Chọn môn học:</span>
                <select
                  value={cribSubjectId}
                  onChange={(e) => setCribSubjectId(e.target.value)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs"
                >
                  <option value="">Tất cả môn học</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={printCribSheetA4}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium"
              >
                <Printer className="h-3.5 w-3.5" /> In / Lưu PDF 1 trang A4
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">Công thức đã ghim</div>
                <div className="mt-1 font-mono text-xl font-bold text-[var(--accent)]">{cribFormulas.length}</div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">Lỗi sai chưa vững</div>
                <div className="mt-1 font-mono text-xl font-bold text-rose-500">{cribMistakes.length}</div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">Ghi chú liên quan</div>
                <div className="mt-1 font-mono text-xl font-bold text-emerald-600">{cribNotes.length}</div>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Hệ thống tự gom công thức, lỗi sai chưa vững và tóm tắt ghi chú của môn học vào bố cục 2 cột chuẩn A4 sạch sẽ, không dính thanh điều hướng khi in.
            </p>
          </div>
        )}

        {/* TAB 2: PROBLEM SET TRACKER */}
        {tab === "problems" && (
          <div className="mt-4 space-y-3 text-xs">
            <form onSubmit={addProblemSet} className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <input
                type="text"
                required
                value={psTitle}
                onChange={(e) => setPsTitle(e.target.value)}
                placeholder="Tên đề ôn / bộ bài tập (VD: Đề mẫu Tài chính 40 câu)..."
                className="min-w-[180px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="number"
                min={5}
                max={100}
                value={psCount}
                onChange={(e) => setPsCount(Number(e.target.value))}
                title="Số câu"
                className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono"
              />
              <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Tạo đề
              </button>
              <button
                type="button"
                onClick={() => setPsOnlyWrong((v) => !v)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                  psOnlyWrong ? "border-rose-500 bg-rose-500/15 text-rose-600" : "border-[var(--border-subtle)]"
                }`}
              >
                {psOnlyWrong ? "Đang lọc câu Sai/Xem lại" : "Chỉ hiện câu Sai"}
              </button>
            </form>

            {problemSets.length === 0 ? (
              <p className="py-6 text-center text-[var(--text-muted)]">
                Tạo bộ câu hỏi rồi nhấn từng số để chuyển trạng thái: Đúng (xanh) → Sai (đỏ) → Xem lại (vàng).
              </p>
            ) : (
              <div className="space-y-3">
                {problemSets.map((ps) => {
                  const right = ps.statuses.filter((s) => s === "right").length;
                  const wrong = ps.statuses.filter((s) => s === "wrong").length;
                  const done = ps.statuses.filter((s) => s !== "none").length;
                  return (
                    <div key={ps.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-[var(--text-primary)]">{ps.title}</div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-mono text-emerald-600">✓ {right}</span>
                          <span className="font-mono text-rose-500">✗ {wrong}</span>
                          <span className="font-mono text-[var(--text-muted)]">
                            ({done}/{ps.total} · {done > 0 ? Math.round((right / done) * 100) : 0}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = problemSets.filter((x) => x.id !== ps.id);
                              setProblemSets(next);
                              saveJson(PROB_KEY, next);
                            }}
                            className="text-[var(--text-muted)] hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {ps.statuses.map((st, qi) => {
                          if (psOnlyWrong && st !== "wrong" && st !== "review") return null;
                          const cls =
                            st === "right"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : st === "wrong"
                              ? "border-rose-500 bg-rose-500/20 text-rose-600"
                              : st === "review"
                              ? "border-amber-500 bg-amber-500/20 text-amber-600"
                              : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]";
                          return (
                            <button
                              key={qi}
                              type="button"
                              onClick={() => {
                                const next = problemSets.map((x) =>
                                  x.id === ps.id
                                    ? {
                                        ...x,
                                        statuses: x.statuses.map((v, i) => (i === qi ? cycleStatus(v) : v)),
                                      }
                                    : x
                                );
                                setProblemSets(next);
                                saveJson(PROB_KEY, next);
                              }}
                              className={`h-7 w-7 rounded-lg border font-mono text-[11px] font-semibold ${cls}`}
                            >
                              {qi + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPARISON MATRIX */}
        {tab === "compare" && (
          <div className="mt-4 space-y-3 text-xs">
            <form onSubmit={addComparison} className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-4">
              <input
                type="text"
                required
                value={cmpTitle}
                onChange={(e) => setCmpTitle(e.target.value)}
                placeholder="Chủ đề so sánh..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                required
                value={cmpA}
                onChange={(e) => setCmpA(e.target.value)}
                placeholder="Khái niệm A (VD: BFS)"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                required
                value={cmpB}
                onChange={(e) => setCmpB(e.target.value)}
                placeholder="Khái niệm B (VD: DFS)"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <button type="submit" className="btn-primary rounded-lg px-3 py-1.5 font-medium">
                + Tạo bảng
              </button>
            </form>

            {comparisons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {comparisons.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCmpId(c.id)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                      activeCmp?.id === c.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                        : "border-[var(--border-subtle)]"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {activeCmp && (
              <div className="space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeCmp.title}: {activeCmp.nameA} vs {activeCmp.nameB}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const md = [
                          `### ${activeCmp.title}`,
                          `| Tiêu chí | ${activeCmp.nameA} | ${activeCmp.nameB} |`,
                          `| --- | --- | --- |`,
                          ...activeCmp.rows.map((r) => `| ${r.criterion} | ${r.colA} | ${r.colB} |`),
                        ].join("\n");
                        navigator.clipboard?.writeText(md).catch(() => {});
                        kfNotify("Đã sao chép bảng so sánh Markdown!");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-[var(--accent)]"
                    >
                      <Copy className="h-3 w-3" /> Chép Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = comparisons.filter((x) => x.id !== activeCmp.id);
                        setComparisons(next);
                        saveJson(COMP_KEY, next);
                      }}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                      <th className="py-1.5 pr-2">Tiêu chí</th>
                      <th className="py-1.5 pr-2">{activeCmp.nameA}</th>
                      <th className="py-1.5">{activeCmp.nameB}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {activeCmp.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 pr-2 font-medium text-[var(--text-primary)]">{r.criterion}</td>
                        <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{r.colA}</td>
                        <td className="py-1.5 text-[var(--text-secondary)]">{r.colB}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <form onSubmit={addComparisonRow} className="grid gap-1.5 sm:grid-cols-4">
                  <input
                    type="text"
                    required
                    value={critLabel}
                    onChange={(e) => setCritLabel(e.target.value)}
                    placeholder="Tiêu chí (VD: Cấu trúc)..."
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1"
                  />
                  <input
                    type="text"
                    value={critA}
                    onChange={(e) => setCritA(e.target.value)}
                    placeholder={`Đặc điểm ${activeCmp.nameA}...`}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1"
                  />
                  <input
                    type="text"
                    value={critB}
                    onChange={(e) => setCritB(e.target.value)}
                    placeholder={`Đặc điểm ${activeCmp.nameB}...`}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1"
                  />
                  <button type="submit" className="btn-primary rounded-lg px-2.5 py-1 font-medium">
                    + Thêm dòng
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SPACED EXAM D-14..D-1 & ABSENCE GUARD */}
        {tab === "guard" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <CalendarCheck2 className="h-4 w-4 text-[var(--accent)]" />
                Lộ trình ôn ngược theo kỳ thi (D-14 → D-7 → D-3 → D-1)
              </div>
              {exams.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)]">
                  Chưa có kỳ thi nào trên Dashboard để sinh mốc ôn tập tự động.
                </p>
              ) : (
                <div className="space-y-2">
                  {exams.slice(0, 4).map((ex) => {
                    const exTime = new Date(ex.examDate).getTime();
                    const milestones = [
                      { offset: 14, label: "D-14: Hệ thống hóa đề cương" },
                      { offset: 7, label: "D-7: Giải đề mẫu & bấm giờ" },
                      { offset: 3, label: "D-3: Ôn kỹ lỗi sai hay mắc" },
                      { offset: 1, label: "D-1: Đọc lại công thức & ngủ sớm" },
                    ];
                    return (
                      <div key={ex.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {ex.title} ({ex.examDate.slice(0, 10)})
                        </div>
                        <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                          {milestones.map((ms) => {
                            const key = `${ex.id}-${ms.offset}`;
                            const dt = new Date(exTime - ms.offset * 86400000).toLocaleDateString("vi-VN");
                            const checked = Boolean(spacedDone[key]);
                            return (
                              <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const next = { ...spacedDone, [key]: !checked };
                                    setSpacedDone(next);
                                    saveJson(SPACED_KEY, next);
                                  }}
                                />
                                <span className={checked ? "line-through text-[var(--text-muted)]" : ""}>
                                  {ms.label} ({dt})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                Cảnh báo Điểm danh chống Cấm thi (Trần nghỉ tối đa 20%)
              </div>
              {subjects.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)]">Thêm môn học để theo dõi số buổi nghỉ an toàn.</p>
              ) : (
                <div className="space-y-2">
                  {subjects.map((sub) => {
                    const entry = absenceMap[sub.id] ?? { totalSessions: 15, absentCount: 0 };
                    const maxAllowed = Math.max(1, Math.floor(entry.totalSessions * 0.2));
                    const ratio = entry.absentCount / maxAllowed;
                    const badgeCls =
                      entry.absentCount > maxAllowed
                        ? "bg-rose-500/20 text-rose-600"
                        : ratio >= 0.7
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-emerald-500/15 text-emerald-600";
                    const setEntry = (patch: Partial<AbsenceEntry>) => {
                      const next = { ...absenceMap, [sub.id]: { ...entry, ...patch } };
                      setAbsenceMap(next);
                      saveJson(ABSENCE_KEY, next);
                    };
                    return (
                      <div
                        key={sub.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2"
                      >
                        <div className="font-medium text-[var(--text-primary)]">{sub.name}</div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <select
                            value={entry.totalSessions}
                            onChange={(e) => setEntry({ totalSessions: Number(e.target.value) })}
                            className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[10px]"
                          >
                            <option value={10}>10 buổi (tối đa 2)</option>
                            <option value={12}>12 buổi (tối đa 2)</option>
                            <option value={15}>15 buổi (tối đa 3)</option>
                          </select>
                          <span className={`rounded-full px-2 py-0.5 font-mono font-semibold ${badgeCls}`}>
                            Vắng {entry.absentCount}/{maxAllowed}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEntry({ absentCount: Math.max(0, entry.absentCount - 1) })}
                            className="rounded border border-[var(--border-subtle)] px-1.5 py-0.5"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntry({ absentCount: entry.absentCount + 1 })}
                            className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-rose-600"
                          >
                            +1 vắng
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: 3-LINE DAILY SHUTDOWN & QUICK CONVERTER */}
        {tab === "shutdown" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <Calculator className="h-4 w-4 text-[var(--accent)]" />
                Quy đổi nhanh 1 giây (Hệ 10 ↔ Hệ 4 thực ×0.4 ↔ Điểm chữ) & Tốc độ học
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 rounded-lg bg-[var(--bg-surface)] p-2.5">
                  <label className="text-[10px] text-[var(--text-muted)]">Nhập điểm hệ 10:</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.05}
                    value={conv10}
                    onChange={(e) => setConv10(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 font-mono text-sm font-bold"
                  />
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span>
                      Hệ 4 thực: <strong className="font-mono text-[var(--accent)]">{conv4Exact}</strong>
                    </span>
                    <span>
                      Điểm chữ: <strong className="font-mono">{!isNaN(conv10Num) ? letterFrom10(conv10Num) : "—"}</strong>
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 rounded-lg bg-[var(--bg-surface)] p-2.5">
                  <div className="text-[10px] text-[var(--text-muted)]">Tính tốc độ cần học kịp hạn:</div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={paceTotal}
                      onChange={(e) => setPaceTotal(Math.max(1, Number(e.target.value)))}
                      className="w-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 font-mono"
                      title="Tổng trang hoặc bài"
                    />
                    <input
                      type="number"
                      min={1}
                      value={paceDays}
                      onChange={(e) => setPaceDays(Math.max(1, Number(e.target.value)))}
                      className="w-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 font-mono"
                      title="Số ngày còn lại"
                    />
                  </div>
                  <div className="pt-1 text-[11px] text-[var(--text-secondary)]">
                    Cần đạt: <strong className="font-mono text-emerald-600">{Math.ceil(paceTotal / Math.max(1, paceDays))}</strong> đơn vị / ngày
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!sdDone.trim() && !sdTomorrow.trim()) return;
                const entry: ShutdownEntry = {
                  date: getLocalDateIso(),
                  done: sdDone.trim(),
                  blocker: sdBlocker.trim(),
                  firstTomorrow: sdTomorrow.trim(),
                };
                const next = [entry, ...shutdowns.filter((x) => x.date !== entry.date)].slice(0, 14);
                setShutdowns(next);
                saveJson(SHUTDOWN_KEY, next);
                setSdDone("");
                setSdBlocker("");
                setSdTomorrow("");
              }}
              className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5"
            >
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <Moon className="h-4 w-4 text-indigo-500" />
                Chốt ngày 3 dòng (Daily Shutdown Ritual)
              </div>
              <input
                type="text"
                value={sdDone}
                onChange={(e) => setSdDone(e.target.value)}
                placeholder="1. Hôm nay mình đã hoàn thành xong gì?"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={sdBlocker}
                onChange={(e) => setSdBlocker(e.target.value)}
                placeholder="2. Điểm vướng mắc hoặc cần hỏi lại?"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={sdTomorrow}
                onChange={(e) => setSdTomorrow(e.target.value)}
                placeholder="3. Việc quan trọng nhất làm đầu tiên sáng mai?"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <button type="submit" className="btn-primary rounded-lg px-3.5 py-1.5 font-medium">
                Lưu chốt ngày hôm nay
              </button>
            </form>

            {shutdowns.length > 0 && (
              <div className="space-y-1.5">
                {shutdowns.slice(0, 4).map((sd) => (
                  <div
                    key={sd.date}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-[11px]"
                  >
                    <div className="font-mono font-semibold text-[var(--accent)]">{sd.date}</div>
                    {sd.done && <div>✓ Xong: {sd.done}</div>}
                    {sd.blocker && <div className="text-amber-600">! Vướng: {sd.blocker}</div>}
                    {sd.firstTomorrow && <div className="text-emerald-600">→ Sáng mai: {sd.firstTomorrow}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
