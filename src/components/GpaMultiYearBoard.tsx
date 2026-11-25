"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Calculator,
  CheckCircle2,
  Download,
  GraduationCap,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import type { GradeRecord } from "./ScheduleGpaPanel";

export interface ComponentScoreItem {
  id: string;
  label: string;
  score: number;
  weight: number;
}

export interface CourseGpaMeta {
  components: ComponentScoreItem[];
  finalExamScore: number | null;
  finalWeightPct: number; // default 50 (50% thành phần + 50% cuối kỳ)
  excludeFromGpa: boolean;
}

type GpaScaleMode = "linear" | "step";

const STORAGE_KEY = "kronoflow-gpa-meta-v1";
const SCALE_KEY = "kronoflow-gpa-scale-v1";

function isDefaultExcludedCourse(courseName: string): boolean {
  const n = courseName.toLowerCase();
  return (
    n.includes("thể chất") ||
    n.includes("the chat") ||
    n.includes("quốc phòng") ||
    n.includes("quoc phong") ||
    n.includes("gdtc") ||
    n.includes("gdqp")
  );
}

function toGpa4(s10: number, mode: GpaScaleMode): number {
  if (mode === "linear") {
    return Math.round(s10 * 0.4 * 100) / 100;
  }
  if (s10 >= 8.5) return 4.0;
  if (s10 >= 8.0) return 3.5;
  if (s10 >= 7.0) return 3.0;
  if (s10 >= 6.5) return 2.5;
  if (s10 >= 5.5) return 2.0;
  if (s10 >= 5.0) return 1.5;
  if (s10 >= 4.0) return 1.0;
  return 0.0;
}

function toLetter(s10: number, mode: GpaScaleMode): string {
  if (mode === "linear" && s10 >= 9.0) return "A+";
  if (s10 >= 8.5) return "A";
  if (s10 >= 8.0) return "B+";
  if (s10 >= 7.0) return "B";
  if (s10 >= 6.5) return "C+";
  if (s10 >= 5.5) return "C";
  if (s10 >= 5.0) return "D+";
  if (s10 >= 4.0) return "D";
  return "F";
}

function classifyGpa4(gpa4: number): { label: string; color: string } {
  if (gpa4 >= 3.6) return { label: "Xuất sắc", color: "text-emerald-600 dark:text-emerald-400" };
  if (gpa4 >= 3.2) return { label: "Giỏi", color: "text-sky-600 dark:text-sky-400" };
  if (gpa4 >= 2.5) return { label: "Khá", color: "text-amber-600 dark:text-amber-400" };
  if (gpa4 >= 2.0) return { label: "Trung bình", color: "text-[var(--text-primary)]" };
  return { label: "Cần cải thiện", color: "text-rose-500" };
}

function extractAcademicYear(semester: string): string {
  const s = semester.trim();
  const yrSpan = s.match(/(20\d{2})\s*[-–/]\s*(20\d{2})/);
  if (yrSpan && yrSpan[1] && yrSpan[2]) return `Năm học ${yrSpan[1]} - ${yrSpan[2]}`;
  const namMatch = s.match(/n[aă]m\s*(\d+)/i);
  if (namMatch && namMatch[1]) return `Năm ${namMatch[1]}`;
  const yrSingle = s.match(/20\d{2}/);
  if (yrSingle && yrSingle[0]) return `Năm ${yrSingle[0]}`;
  const hkNum = s.match(/(?:học kỳ|hk)\s*(\d+)/i);
  if (hkNum && hkNum[1]) {
    const n = Number(hkNum[1]);
    if (n >= 1 && n <= 18) return `Năm ${Math.ceil(n / 3)}`;
  }
  return "Năm học chung";
}

function semesterSortKey(semester: string): string {
  const s = semester.trim();
  const yr = s.match(/(20\d{2})/);
  const hk = s.match(/(?:học kỳ|hk)\s*(\d+)/i);
  const yPart = yr && yr[1] ? yr[1] : "9999";
  const hPart = hk && hk[1] ? hk[1].padStart(2, "0") : "99";
  return `${yPart}-${hPart}-${s}`;
}

function calcComponentAvg(components: ComponentScoreItem[]): number | null {
  const valid = components.filter((c) => isFinite(c.score) && c.weight > 0);
  if (valid.length === 0) return null;
  const sumW = valid.reduce((a, b) => a + b.weight, 0);
  if (sumW <= 0) return null;
  const weighted = valid.reduce((a, b) => a + b.score * b.weight, 0);
  return Math.round((weighted / sumW) * 100) / 100;
}

function computeWeightedStats(
  list: GradeRecord[],
  metaMap: Record<string, CourseGpaMeta>,
  scale: GpaScaleMode
) {
  const included = list.filter((g) => {
    const meta = metaMap[g.id];
    const excluded = meta ? meta.excludeFromGpa : isDefaultExcludedCourse(g.courseName);
    return !excluded && g.credits > 0 && g.score10 > 0;
  });
  const credits = included.reduce((a, b) => a + b.credits, 0);
  if (credits <= 0) return { credits: 0, gpa10: 0, gpa4: 0, count: included.length };
  const w10 = included.reduce((a, b) => a + b.score10 * b.credits, 0);
  const gpa10Raw = w10 / credits;
  const gpa4Raw =
    scale === "linear"
      ? gpa10Raw * 0.4
      : included.reduce((a, b) => a + toGpa4(b.score10, scale) * b.credits, 0) / credits;
  return {
    credits,
    gpa10: Math.round(gpa10Raw * 100) / 100,
    gpa4: Math.round(gpa4Raw * 100) / 100,
    count: included.length,
  };
}

interface ParsedImportRow {
  semester: string;
  courseName: string;
  credits: number;
  examScore: number | null;
  score10: number;
}

function parsePortalTranscript(raw: string): ParsedImportRow[] {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  let currentSem = "Học kỳ 1 - Năm học 2025 - 2026";
  const rows: ParsedImportRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect semester header e.g. "Học kỳ 2 - Năm học 2025 - 2026"
    const semMatch = line.match(/Học kỳ\s*\d+\s*[-–]\s*Năm học\s*20\d{2}\s*[-–]\s*20\d{2}/i);
    if (semMatch && semMatch[0]) {
      currentSem = semMatch[0].replace(/\s+/g, " ").trim();
      continue;
    }

    if (line.startsWith("-") || /^Stt\b/i.test(line)) continue;

    // Split by tab (copy from Excel/portal) or comma
    const cols = line.includes("\t")
      ? line.split("\t").map((x) => x.trim())
      : line.split(",").map((x) => x.replace(/^"|"$/g, "").trim());

    // Portal Excel format: [Stt, Mã MH, Nhóm, Tên môn học, Số tín chỉ, Điểm thi, Điểm TK (10), ...]
    if (cols.length >= 7 && /^\d+$/.test(cols[0] ?? "")) {
      const name = cols[3] ?? "";
      const cr = Number(cols[4] ?? 0);
      const exam = cols[5] !== undefined && cols[5] !== "" ? Number(cols[5]) : null;
      const tk10 = Number(cols[6] ?? "");
      if (name && cr >= 1 && !isNaN(tk10) && tk10 >= 0 && tk10 <= 10) {
        rows.push({
          semester: currentSem,
          courseName: name,
          credits: Math.round(cr),
          examScore: exam !== null && !isNaN(exam) ? exam : null,
          score10: tk10,
        });
      }
    }
  }
  return rows;
}

export function GpaMultiYearBoard({
  grades,
  onRefresh,
}: {
  grades: GradeRecord[];
  onRefresh?: () => void;
}) {
  const [scaleMode, setScaleMode] = useState<GpaScaleMode>("linear");
  const [groupMode, setGroupMode] = useState<"semester" | "year" | "course" | "condition">("semester");
  const [programCredits, setProgramCredits] = useState(130);
  const [metaMap, setMetaMap] = useState<Record<string, CourseGpaMeta>>({});
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [savingScore, setSavingScore] = useState(false);

  // Quick Add Course with HK1/HK2/HK3 + Year
  const [addOpen, setAddOpen] = useState(false);
  const [newCourse, setNewCourse] = useState("");
  const [newCredits, setNewCredits] = useState(3);
  const [newHk, setNewHk] = useState("Học kỳ 1");
  const [newYear, setNewYear] = useState("2026 - 2027");
  const [newFinalWeight, setNewFinalWeight] = useState(50);
  const [newComps, setNewComps] = useState<ComponentScoreItem[]>([
    { id: "c1", label: "Chuyên cần", score: 10, weight: 1 },
    { id: "c2", label: "Giữa kỳ / Thực hành", score: 8, weight: 2 },
  ]);
  const [newExam, setNewExam] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);

  // Bulk Portal Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Retake / future simulator
  const [retakeId, setRetakeId] = useState("");
  const [retakeScore, setRetakeScore] = useState(9.0);
  const [futureCredits, setFutureCredits] = useState(15);
  const [futureScore10, setFutureScore10] = useState(9.0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMetaMap(JSON.parse(raw) as Record<string, CourseGpaMeta>);
      const sc = localStorage.getItem(SCALE_KEY);
      if (sc === "linear" || sc === "step") setScaleMode(sc);
    } catch {
      // ignore
    }
  }, []);

  const persistMeta = (next: Record<string, CourseGpaMeta>) => {
    setMetaMap(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const getCourseMeta = (g: GradeRecord): CourseGpaMeta => {
    const existing = metaMap[g.id];
    if (existing) return existing;
    return {
      components: [{ id: "qt", label: "Quá trình", score: g.score10 > 0 ? g.score10 : 8.0, weight: 1 }],
      finalExamScore: g.score10 > 0 ? g.score10 : null,
      finalWeightPct: 50,
      excludeFromGpa: isDefaultExcludedCourse(g.courseName),
    };
  };

  const updateCourseMeta = (g: GradeRecord, patch: Partial<CourseGpaMeta>) => {
    const cur = getCourseMeta(g);
    persistMeta({
      ...metaMap,
      [g.id]: { ...cur, ...patch },
    });
  };

  const saveComputedScoreToDb = async (g: GradeRecord, score10: number) => {
    setSavingScore(true);
    try {
      const rounded = Math.round(Math.min(10, Math.max(0, score10)) * 10) / 10;
      const res = await fetch(`/api/grades/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score10: rounded }),
      });
      if (res.ok) onRefresh?.();
    } finally {
      setSavingScore(false);
    }
  };

  const overall = useMemo(
    () => computeWeightedStats(grades, metaMap, scaleMode),
    [grades, metaMap, scaleMode]
  );
  const rank = classifyGpa4(overall.gpa4);

  // Semester breakdown with running cumulative CPA (6 official portal metrics!)
  const bySemester = useMemo(() => {
    const map = new Map<string, GradeRecord[]>();
    for (const g of grades) {
      const k = g.semester.trim() || "Chưa phân kỳ";
      const arr = map.get(k) ?? [];
      arr.push(g);
      map.set(k, arr);
    }
    const sorted = [...map.entries()].sort((a, b) =>
      semesterSortKey(a[0]).localeCompare(semesterSortKey(b[0]))
    );
    const accGrades: GradeRecord[] = [];
    return sorted.map(([name, items]) => {
      accGrades.push(...items);
      const semStats = computeWeightedStats(items, metaMap, scaleMode);
      const cumStats = computeWeightedStats(accGrades, metaMap, scaleMode);
      return {
        name,
        items,
        semStats,
        cumStats,
      };
    });
  }, [grades, metaMap, scaleMode]);

  const byYear = useMemo(() => {
    const map = new Map<string, GradeRecord[]>();
    for (const g of grades) {
      const y = extractAcademicYear(g.semester);
      const arr = map.get(y) ?? [];
      arr.push(g);
      map.set(y, arr);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, items]) => ({
        name,
        items,
        stats: computeWeightedStats(items, metaMap, scaleMode),
      }));
  }, [grades, metaMap, scaleMode]);

  const conditionCourses = useMemo(
    () =>
      grades.filter((g) => {
        const m = metaMap[g.id];
        return m ? m.excludeFromGpa : isDefaultExcludedCourse(g.courseName);
      }),
    [grades, metaMap]
  );

  const simulated = useMemo(() => {
    const modified = grades.map((g) =>
      g.id === retakeId ? { ...g, score10: Math.min(10, Math.max(0, retakeScore)) } : g
    );
    const base = computeWeightedStats(modified, metaMap, scaleMode);
    const addCr = Math.max(0, futureCredits);
    const totCr = base.credits + addCr;
    if (totCr <= 0) return { gpa4: 0, gpa10: 0, delta: 0 };
    const newGpa10 = (base.gpa10 * base.credits + futureScore10 * addCr) / totCr;
    const addGpa4 = toGpa4(futureScore10, scaleMode);
    const newGpa4 =
      scaleMode === "linear"
        ? Math.round(newGpa10 * 0.4 * 100) / 100
        : Math.round(((base.gpa4 * base.credits + addGpa4 * addCr) / totCr) * 100) / 100;
    return {
      gpa10: Math.round(newGpa10 * 100) / 100,
      gpa4: newGpa4,
      delta: Math.round((newGpa4 - overall.gpa4) * 100) / 100,
    };
  }, [grades, retakeId, retakeScore, futureCredits, futureScore10, metaMap, scaleMode, overall.gpa4]);

  const handleQuickAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.trim()) return;
    setAddingCourse(true);
    try {
      const qt = calcComponentAvg(newComps);
      const exNum = newExam.trim() !== "" ? Number(newExam) : null;
      const wFin = newFinalWeight / 100;
      const computedTk10 =
        qt !== null && exNum !== null && !isNaN(exNum)
          ? Math.round((qt * (1 - wFin) + exNum * wFin) * 10) / 10
          : qt !== null && exNum === null
          ? 0
          : 0;
      const semesterLabel = `${newHk} - Năm học ${newYear}`;
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: newCourse.trim(),
          credits: Math.max(1, newCredits),
          score10: computedTk10,
          semester: semesterLabel,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const createdId = json?.data?.id as string | undefined;
        if (createdId) {
          persistMeta({
            ...metaMap,
            [createdId]: {
              components: newComps,
              finalExamScore: exNum !== null && !isNaN(exNum) ? exNum : null,
              finalWeightPct: newFinalWeight,
              excludeFromGpa: isDefaultExcludedCourse(newCourse.trim()),
            },
          });
        }
        setNewCourse("");
        setNewExam("");
        setAddOpen(false);
        onRefresh?.();
      }
    } finally {
      setAddingCourse(false);
    }
  };

  const parsedImportRows = useMemo(() => parsePortalTranscript(importText), [importText]);

  const handleImportRows = async () => {
    if (parsedImportRows.length === 0) return;
    setImporting(true);
    try {
      const existingKeys = new Set(
        grades.map((g) => `${g.semester.trim().toLowerCase()}||${g.courseName.trim().toLowerCase()}`)
      );
      const nextMeta = { ...metaMap };
      let added = 0;
      for (const row of parsedImportRows) {
        const k = `${row.semester.trim().toLowerCase()}||${row.courseName.trim().toLowerCase()}`;
        if (existingKeys.has(k)) continue;
        const res = await fetch("/api/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseName: row.courseName,
            credits: row.credits,
            score10: row.score10,
            semester: row.semester,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const createdId = json?.data?.id as string | undefined;
          if (createdId) {
            // Back-calculate implied 50% QT from TK10 and examScore if available
            const impliedQt =
              row.examScore !== null
                ? Math.min(10, Math.max(0, Math.round((row.score10 * 2 - row.examScore) * 10) / 10))
                : row.score10;
            nextMeta[createdId] = {
              components: [{ id: "qt", label: "Quá trình", score: impliedQt, weight: 1 }],
              finalExamScore: row.examScore,
              finalWeightPct: 50,
              excludeFromGpa: isDefaultExcludedCourse(row.courseName),
            };
          }
          added += 1;
        }
      }
      persistMeta(nextMeta);
      setImportText("");
      setImportOpen(false);
      onRefresh?.();
      window.alert(`Đã nhập thành công ${added} học phần mới từ bảng điểm!`);
    } finally {
      setImporting(false);
    }
  };

  const exportTranscriptCsv = () => {
    const header = "Nam hoc,Hoc ky,Mon hoc,Tin chi,Tinh GPA,Diem TK 10,Diem TK 4,Diem chu\n";
    const rows = grades
      .map((g) => {
        const m = getCourseMeta(g);
        return `"${extractAcademicYear(g.semester)}","${g.semester.replaceAll('"', '""')}","${g.courseName.replaceAll('"', '""')}",${g.credits},"${m.excludeFromGpa ? "Khong" : "Co"}",${g.score10},${toGpa4(g.score10, scaleMode)},${toLetter(g.score10, scaleMode)}`;
      })
      .join("\n");
    const summary = `\n"TONG KET TICH LUY","","",${overall.credits},"",${overall.gpa10},${overall.gpa4},"${rank.label}"`;
    const blob = new Blob(["\uFEFF" + header + rows + summary], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-gpa-transcript-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = Math.min(100, Math.round((overall.credits / Math.max(1, programCredits)) * 100));
  const activeGrade = grades.find((g) => g.id === activeCourseId) ?? null;

  return (
    <section className="glass-card card-lift space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Hệ thống GPA chuẩn Tín chỉ (50% Thành phần + 50% Cuối kỳ · HK1 / HK2 / HK3)
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Hỗ trợ nhiều cột điểm thành phần có hệ số riêng, tự loại trừ GDTC/GDQP và tính 6 chỉ số tích lũy từng kỳ.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={scaleMode}
            onChange={(e) => {
              const v = e.target.value as GpaScaleMode;
              setScaleMode(v);
              try {
                localStorage.setItem(SCALE_KEY, v);
              } catch {
                // ignore
              }
            }}
            title="Chọn hệ quy đổi thang 4"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)]"
          >
            <option value="linear">Hệ 4 tuyến tính (×0.4 · có A+)</option>
            <option value="step">Hệ 4 bậc thang (4.0/3.5/3.0)</option>
          </select>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="btn-primary inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm môn (50/50)
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Upload className="h-3.5 w-3.5" /> Nhập bảng điểm
          </button>
          {grades.length > 0 && (
            <button
              type="button"
              onClick={exportTranscriptCsv}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      {/* QUICK ADD COURSE WITH HK1/HK2/HK3 + MULTI-COMPONENT 50/50 */}
      {addOpen && (
        <form
          onSubmit={handleQuickAddCourse}
          className="space-y-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-canvas)] p-4 text-xs"
        >
          <div className="font-semibold text-[var(--text-primary)]">
            Thêm học phần với Điểm thành phần nhiều cột (50%) + Điểm cuối kỳ (50%)
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <input
              type="text"
              required
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              placeholder="Tên môn học (VD: Cấu trúc dữ liệu)..."
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 sm:col-span-2"
            />
            <select
              value={newHk}
              onChange={(e) => setNewHk(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
            >
              <option value="Học kỳ 1">Học kỳ 1</option>
              <option value="Học kỳ 2">Học kỳ 2</option>
              <option value="Học kỳ 3">Học kỳ 3 (Hè)</option>
            </select>
            <select
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
            >
              {["2024 - 2025", "2025 - 2026", "2026 - 2027", "2027 - 2028", "2028 - 2029", "2029 - 2030"].map(
                (y) => (
                  <option key={y} value={y}>
                    Năm học {y}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-[11px] text-[var(--text-muted)]">
              <span>Số tín chỉ</span>
              <input
                type="number"
                min={1}
                max={15}
                value={newCredits}
                onChange={(e) => setNewCredits(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-[11px] text-[var(--text-muted)]">
              <span>Tỷ lệ Thành phần / Cuối kỳ</span>
              <select
                value={newFinalWeight}
                onChange={(e) => setNewFinalWeight(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[var(--text-primary)]"
              >
                <option value={50}>50% Thành phần · 50% Cuối kỳ</option>
                <option value={60}>40% Thành phần · 60% Cuối kỳ</option>
                <option value={70}>30% Thành phần · 70% Cuối kỳ</option>
              </select>
            </label>
            <label className="space-y-1 text-[11px] text-[var(--text-muted)]">
              <span>Điểm thi cuối kỳ (để trống nếu chưa thi)</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={newExam}
                onChange={(e) => setNewExam(e.target.value)}
                placeholder="VD: 8.5"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[var(--text-primary)]"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Các cột điểm thành phần (tự chia theo tổng hệ số):</span>
              <button
                type="button"
                onClick={() =>
                  setNewComps((prev) => [
                    ...prev,
                    { id: `c-${Date.now()}`, label: `Cột ${prev.length + 1}`, score: 8, weight: 1 },
                  ])
                }
                className="text-[var(--accent)] hover:underline"
              >
                + Thêm cột thành phần
              </button>
            </div>
            {newComps.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) =>
                    setNewComps((prev) => prev.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Tên cột (Chuyên cần, GK...)"
                  className="min-w-[130px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1"
                />
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={c.score}
                  onChange={(e) =>
                    setNewComps((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, score: Number(e.target.value) } : x))
                    )
                  }
                  title="Điểm (0-10)"
                  className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                />
                <span className="text-[10px] text-[var(--text-muted)]">× hệ số</span>
                <input
                  type="number"
                  min={0.5}
                  max={100}
                  step={0.5}
                  value={c.weight}
                  onChange={(e) =>
                    setNewComps((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, weight: Number(e.target.value) } : x))
                    )
                  }
                  title="Hệ số hoặc % trọng số"
                  className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                />
                {newComps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setNewComps((prev) => prev.filter((x) => x.id !== c.id))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {(() => {
            const qt = calcComponentAvg(newComps);
            const ex = newExam.trim() !== "" ? Number(newExam) : null;
            const wFin = newFinalWeight / 100;
            const tk10 =
              qt !== null && ex !== null && !isNaN(ex)
                ? Math.round((qt * (1 - wFin) + ex * wFin) * 10) / 10
                : null;
            return (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-[11px]">
                <div>
                  ĐTB Thành phần: <strong className="font-mono text-[var(--accent)]">{qt?.toFixed(2) ?? "--"}</strong>
                  {tk10 !== null ? (
                    <span className="ml-2">
                      → Tổng kết: <strong className="font-mono">{tk10.toFixed(1)}</strong> (Hệ 4:{" "}
                      <strong>{toGpa4(tk10, scaleMode).toFixed(2)}</strong> ·{" "}
                      <strong>{toLetter(tk10, scaleMode)}</strong>)
                    </span>
                  ) : qt !== null ? (
                    <span className="ml-2 text-[var(--text-muted)]">
                      Cần thi CK ≥{" "}
                      <strong className="font-mono text-emerald-600">
                        {Math.max(0, (9.0 - qt * (1 - wFin)) / wFin).toFixed(1)}
                      </strong>{" "}
                      để đạt A+ (9.0)
                    </span>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={addingCourse}
                  className="btn-primary rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
                >
                  {addingCourse ? "Đang lưu..." : "Lưu học phần"}
                </button>
              </div>
            );
          })()}
        </form>
      )}

      {/* BULK IMPORT FROM PORTAL EXCEL / CSV */}
      {importOpen && (
        <div className="space-y-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-[var(--text-primary)]">
              Nhập nhanh bảng điểm từ cổng trường (dán từ Excel hoặc chọn tệp .CSV/.TSV)
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
              <Upload className="h-3 w-3" /> Chọn tệp .CSV/.TSV
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setImportText(String(r.result ?? ""));
                  r.readAsText(f, "utf-8");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Mở file <code>Diem.xlsx</code> trong Excel, chọn toàn bộ bảng (Ctrl+A → Ctrl+C) rồi dán vào ô dưới. Hệ thống tự tách Học kỳ 1/2/3, tự bỏ qua môn 0 tín chỉ và tự đánh dấu GDTC/GDQP không tính CPA.
          </p>
          <textarea
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Dán dữ liệu bảng điểm từ Excel hoặc cổng đào tạo vào đây..."
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 font-mono text-[11px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">
              Nhận diện được: <strong className="text-[var(--text-primary)]">{parsedImportRows.length}</strong> học phần có điểm
            </span>
            <button
              type="button"
              disabled={importing || parsedImportRows.length === 0}
              onClick={handleImportRows}
              className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {importing ? "Đang nhập..." : `Nhập ${parsedImportRows.length} môn`}
            </button>
          </div>
        </div>
      )}

      {/* CPA SUMMARY ROW */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            ĐTB Tích lũy hệ 4 (CPA)
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--accent)]">
            {overall.gpa4.toFixed(2)}
          </div>
          <div className={`text-[11px] font-semibold ${rank.color}`}>{rank.label}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            ĐTB Tích lũy hệ 10
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
            {overall.gpa10.toFixed(2)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {overall.count} môn tính GPA · {conditionCourses.length} môn ĐK
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:col-span-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Tín chỉ tích lũy / Chương trình đào tạo</span>
            <select
              value={programCredits}
              onChange={(e) => setProgramCredits(Number(e.target.value))}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] text-[var(--text-primary)]"
            >
              <option value={120}>4 năm (120 TC)</option>
              <option value={130}>4 năm (130 TC)</option>
              <option value={145}>4.5 năm (145 TC)</option>
              <option value={160}>5 năm Kỹ sư (160 TC)</option>
              <option value={200}>6 năm (200 TC)</option>
            </select>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-xs">
            <strong className="text-[var(--text-primary)]">
              {overall.credits} / {programCredits} TC ({progressPct}%)
            </strong>
            <span className="text-[11px] text-[var(--text-muted)]">
              Còn {Math.max(0, programCredits - overall.credits)} TC
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* VIEW MODE TABS */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["semester", `Theo Học kỳ 1/2/3 (${bySemester.length})`],
            ["year", `Theo Năm học (${byYear.length})`],
            ["course", `Chi tiết từng môn & 50/50 (${grades.length})`],
            ["condition", `Môn điều kiện GDTC/GDQP (${conditionCourses.length})`],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setGroupMode(k)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
              groupMode === k
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {grades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
          Chưa có học phần nào. Bạn có thể bấm <strong>Thêm môn (50/50)</strong> hoặc <strong>Nhập bảng điểm</strong> từ file Excel cổng trường ở góc trên.
        </p>
      ) : groupMode === "semester" ? (
        <div className="space-y-2.5">
          {bySemester.map((sem) => {
            const c = classifyGpa4(sem.semStats.gpa4);
            return (
              <div
                key={sem.name}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-[var(--text-primary)]">{sem.name}</div>
                  {sem.semStats.credits > 0 ? (
                    <span className={`rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-semibold ${c.color}`}>
                      HK: {c.label}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                      Học kỳ điều kiện / chưa có điểm TK
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
                  <div className="rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--text-muted)]">ĐTB học kỳ (4 / 10): </span>
                    <strong className="font-mono text-[var(--accent)]">
                      {sem.semStats.credits > 0
                        ? `${sem.semStats.gpa4.toFixed(2)} / ${sem.semStats.gpa10.toFixed(2)}`
                        : "—"}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--text-muted)]">ĐTB tích lũy (4 / 10): </span>
                    <strong className="font-mono text-[var(--text-primary)]">
                      {sem.cumStats.credits > 0
                        ? `${sem.cumStats.gpa4.toFixed(2)} / ${sem.cumStats.gpa10.toFixed(2)}`
                        : "—"}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--text-muted)]">TC đạt HK / Tích lũy: </span>
                    <strong className="font-mono text-[var(--text-primary)]">
                      {sem.semStats.credits} / {sem.cumStats.credits} TC
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : groupMode === "year" ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {byYear.map((yr) => {
            const c = classifyGpa4(yr.stats.gpa4);
            return (
              <div
                key={yr.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--text-primary)]">{yr.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {yr.stats.count} môn tính GPA · {yr.stats.credits} TC · Hệ 10: {yr.stats.gpa10.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-bold text-[var(--accent)]">
                    {yr.stats.gpa4.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-semibold ${c.color}`}>{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : groupMode === "condition" ? (
        conditionCourses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
            Chưa có môn điều kiện (GDTC / GDQP) nào được gắn cờ loại trừ GPA.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {conditionCourses.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-[var(--text-primary)]">{g.courseName}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {g.semester} · {g.credits} TC (Không tính CPA)
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-600">
                  {g.score10 > 0 ? `${g.score10.toFixed(1)} (${toLetter(g.score10, scaleMode)})` : "Đang học"}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                <th className="py-2 pr-2">Môn học</th>
                <th className="py-2 pr-2">Học kỳ</th>
                <th className="py-2 pr-2 text-right">TC</th>
                <th className="py-2 pr-2 text-right">TK (10)</th>
                <th className="py-2 pr-2 text-right">TK (4)</th>
                <th className="py-2 pr-2 text-right">Chữ</th>
                <th className="py-2 text-right">Chi tiết 50/50</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {grades.map((g) => {
                const meta = getCourseMeta(g);
                return (
                  <tr key={g.id} className={meta.excludeFromGpa ? "opacity-65" : ""}>
                    <td className="py-2 pr-2 font-medium text-[var(--text-primary)]">
                      {g.courseName}
                      {meta.excludeFromGpa && (
                        <span className="ml-1.5 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                          ĐK
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-[11px] text-[var(--text-muted)]">{g.semester}</td>
                    <td className="py-2 pr-2 text-right font-mono">{g.credits}</td>
                    <td className="py-2 pr-2 text-right font-mono">
                      {g.score10 > 0 ? g.score10.toFixed(1) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono font-semibold text-[var(--accent)]">
                      {g.score10 > 0 ? toGpa4(g.score10, scaleMode).toFixed(2) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono font-bold">
                      {g.score10 > 0 ? toLetter(g.score10, scaleMode) : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveCourseId(activeCourseId === g.id ? null : g.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
                      >
                        <SlidersHorizontal className="h-3 w-3" /> 50/50
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PER-COURSE MULTI-COMPONENT (50%) + FINAL EXAM (50%) EDITOR */}
      {activeGrade && (() => {
        const meta = getCourseMeta(activeGrade);
        const qt = calcComponentAvg(meta.components);
        const wFin = meta.finalWeightPct / 100;
        const tk10 =
          qt !== null && meta.finalExamScore !== null
            ? Math.round((qt * (1 - wFin) + meta.finalExamScore * wFin) * 10) / 10
            : null;
        return (
          <div className="space-y-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-canvas)] p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Chi tiết điểm thành phần: {activeGrade.courseName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Thành phần ({100 - meta.finalWeightPct}%) gồm nhiều cột theo hệ số + Cuối kỳ ({meta.finalWeightPct}%)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={meta.excludeFromGpa}
                    onChange={(e) =>
                      updateCourseMeta(activeGrade, { excludeFromGpa: e.target.checked })
                    }
                  />
                  Không tính vào CPA
                </label>
                <select
                  value={meta.finalWeightPct}
                  onChange={(e) =>
                    updateCourseMeta(activeGrade, { finalWeightPct: Number(e.target.value) })
                  }
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px]"
                >
                  <option value={50}>50% QT / 50% CK</option>
                  <option value={60}>40% QT / 60% CK</option>
                  <option value={70}>30% QT / 70% CK</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              {meta.components.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="text"
                    value={c.label}
                    onChange={(e) =>
                      updateCourseMeta(activeGrade, {
                        components: meta.components.map((x) =>
                          x.id === c.id ? { ...x, label: e.target.value } : x
                        ),
                      })
                    }
                    className="min-w-[130px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1"
                  />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={c.score}
                    onChange={(e) =>
                      updateCourseMeta(activeGrade, {
                        components: meta.components.map((x) =>
                          x.id === c.id ? { ...x, score: Number(e.target.value) } : x
                        ),
                      })
                    }
                    className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">hệ số</span>
                  <input
                    type="number"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={c.weight}
                    onChange={(e) =>
                      updateCourseMeta(activeGrade, {
                        components: meta.components.map((x) =>
                          x.id === c.id ? { ...x, weight: Number(e.target.value) } : x
                        ),
                      })
                    }
                    className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  />
                  {meta.components.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateCourseMeta(activeGrade, {
                          components: meta.components.filter((x) => x.id !== c.id),
                        })
                      }
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
                  updateCourseMeta(activeGrade, {
                    components: [
                      ...meta.components,
                      { id: `c-${Date.now()}`, label: `Cột ${meta.components.length + 1}`, score: 8, weight: 1 },
                    ],
                  })
                }
                className="text-[11px] font-medium text-[var(--accent)] hover:underline"
              >
                + Thêm cột điểm thành phần
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Điểm cuối kỳ ({meta.finalWeightPct}%):
                </span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={meta.finalExamScore ?? ""}
                  placeholder="Chưa thi"
                  onChange={(e) =>
                    updateCourseMeta(activeGrade, {
                      finalExamScore: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono"
                />
                {qt !== null && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    ĐTB Thành phần: <strong className="font-mono text-[var(--text-primary)]">{qt.toFixed(2)}</strong>
                  </span>
                )}
              </div>
              {tk10 !== null && (
                <button
                  type="button"
                  disabled={savingScore}
                  onClick={() => saveComputedScoreToDb(activeGrade, tk10)}
                  className="btn-primary rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {savingScore
                    ? "Đang cập nhật..."
                    : `Lưu điểm TK ${tk10.toFixed(1)} (${toGpa4(tk10, scaleMode).toFixed(2)} · ${toLetter(tk10, scaleMode)})`}
                </button>
              )}
            </div>

            {qt !== null && meta.finalExamScore === null && (
              <div className="grid gap-1.5 rounded-xl bg-[var(--bg-elevated)] p-2.5 text-[11px] sm:grid-cols-4">
                {(
                  [
                    ["A+ (9.0)", 9.0],
                    ["A (8.5)", 8.5],
                    ["B+ (8.0)", 8.0],
                    ["B (7.0)", 7.0],
                  ] as const
                ).map(([lbl, target]) => {
                  const need = Math.round(((target - qt * (1 - wFin)) / wFin) * 100) / 100;
                  return (
                    <div key={lbl} className="rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5">
                      <div className="text-[10px] text-[var(--text-muted)]">Đạt {lbl}</div>
                      <div className="font-mono font-semibold text-[var(--accent)]">
                        {need > 10 ? `> 10 (${need.toFixed(1)})` : need <= 0 ? "Đã đạt" : `CK ≥ ${need.toFixed(1)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* RETAKE & FUTURE CREDITS CPA SIMULATOR */}
      {grades.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Calculator className="h-3.5 w-3.5 text-[var(--accent)]" />
              Mô phỏng học cải thiện & các kỳ sắp tới
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--accent)]">
              <Award className="h-3.5 w-3.5" />
              CPA dự kiến: {simulated.gpa4.toFixed(2)} (Hệ 10: {simulated.gpa10.toFixed(2)}){" "}
              <span className={simulated.delta >= 0 ? "text-emerald-600" : "text-rose-500"}>
                ({simulated.delta >= 0 ? `+${simulated.delta.toFixed(2)}` : simulated.delta.toFixed(2)})
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
              <span>Chọn môn học cải thiện</span>
              <select
                value={retakeId}
                onChange={(e) => setRetakeId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <option value="">Không cải thiện môn cũ</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.courseName} ({g.score10}đ)
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
              <span>Điểm cải thiện dự kiến (10)</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                disabled={!retakeId}
                value={retakeScore}
                onChange={(e) => setRetakeScore(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)] disabled:opacity-50"
              />
            </label>
            <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
              <span>Tín chỉ kỳ/năm tới</span>
              <input
                type="number"
                min={0}
                max={120}
                value={futureCredits}
                onChange={(e) => setFutureCredits(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
              <span>ĐTB hệ 10 dự kiến kỳ tới</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={futureScore10}
                onChange={(e) => setFutureScore10(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)]"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
