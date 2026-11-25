"use client";

import { useMemo, useState } from "react";
import { Award, Calculator, Download, GraduationCap } from "lucide-react";
import type { GradeRecord } from "./ScheduleGpaPanel";

function toGpa4(s10: number): number {
  if (s10 >= 8.5) return 4.0;
  if (s10 >= 8.0) return 3.5;
  if (s10 >= 7.0) return 3.0;
  if (s10 >= 6.5) return 2.5;
  if (s10 >= 5.5) return 2.0;
  if (s10 >= 5.0) return 1.5;
  if (s10 >= 4.0) return 1.0;
  return 0.0;
}

function toLetter(s10: number): string {
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
  const yrSpan = s.match(/20\d{2}\s*[-–/]\s*20\d{2}/);
  if (yrSpan && yrSpan[0]) return `Năm học ${yrSpan[0].replace(/\s+/g, "")}`;
  const namMatch = s.match(/n[aă]m\s*(\d+)/i);
  if (namMatch && namMatch[1]) return `Năm ${namMatch[1]}`;
  const yrSingle = s.match(/20\d{2}/);
  if (yrSingle && yrSingle[0]) return `Năm ${yrSingle[0]}`;
  const hkNum = s.match(/hk\s*(\d+)/i);
  if (hkNum && hkNum[1]) {
    const n = Number(hkNum[1]);
    if (n >= 1 && n <= 16) return `Năm ${Math.ceil(n / 2)}`;
  }
  return "Năm học chung";
}

function computeStats(list: GradeRecord[]) {
  const credits = list.reduce((a, b) => a + b.credits, 0);
  if (credits <= 0) return { credits: 0, gpa10: 0, gpa4: 0 };
  const w10 = list.reduce((a, b) => a + b.score10 * b.credits, 0);
  const w4 = list.reduce((a, b) => a + toGpa4(b.score10) * b.credits, 0);
  return {
    credits,
    gpa10: Math.round((w10 / credits) * 100) / 100,
    gpa4: Math.round((w4 / credits) * 100) / 100,
  };
}

export function GpaMultiYearBoard({ grades }: { grades: GradeRecord[] }) {
  const [groupMode, setGroupMode] = useState<"year" | "semester" | "course">("year");
  const [programCredits, setProgramCredits] = useState(130);
  const [retakeId, setRetakeId] = useState("");
  const [retakeScore, setRetakeScore] = useState(8.5);
  const [futureCredits, setFutureCredits] = useState(15);
  const [futureGpa4, setFutureGpa4] = useState(3.5);

  const overall = useMemo(() => computeStats(grades), [grades]);
  const rank = classifyGpa4(overall.gpa4);

  const bySemester = useMemo(() => {
    const map = new Map<string, GradeRecord[]>();
    for (const g of grades) {
      const k = g.semester.trim() || "Chưa phân kỳ";
      const arr = map.get(k) ?? [];
      arr.push(g);
      map.set(k, arr);
    }
    return [...map.entries()].map(([name, items]) => ({
      name,
      items,
      ...computeStats(items),
    }));
  }, [grades]);

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
        ...computeStats(items),
      }));
  }, [grades]);

  const simulated = useMemo(() => {
    const modified = grades.map((g) =>
      g.id === retakeId ? { ...g, score10: Math.min(10, Math.max(0, retakeScore)) } : g
    );
    const base = computeStats(modified);
    const totCr = base.credits + Math.max(0, futureCredits);
    if (totCr <= 0) return { gpa4: 0, delta: 0 };
    const newGpa4 =
      Math.round(((base.gpa4 * base.credits + futureGpa4 * Math.max(0, futureCredits)) / totCr) * 100) /
      100;
    return {
      gpa4: newGpa4,
      delta: Math.round((newGpa4 - overall.gpa4) * 100) / 100,
    };
  }, [grades, retakeId, retakeScore, futureCredits, futureGpa4, overall.gpa4]);

  const exportTranscriptCsv = () => {
    const header = "Nam hoc,Hoc ky,Mon hoc,Tin chi,Diem 10,Diem 4,Diem chu\n";
    const rows = grades
      .map(
        (g) =>
          `"${extractAcademicYear(g.semester)}","${g.semester.replaceAll('"', '""')}","${g.courseName.replaceAll('"', '""')}",${g.credits},${g.score10},${toGpa4(g.score10)},${toLetter(g.score10)}`
      )
      .join("\n");
    const summary = `\n"TONG KET TOAN KHOA","","",${overall.credits},${overall.gpa10},${overall.gpa4},"${rank.label}"`;
    const blob = new Blob(["\uFEFF" + header + rows + summary], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-gpa-transcript-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = Math.min(100, Math.round((overall.credits / Math.max(1, programCredits)) * 100));

  return (
    <section className="glass-card card-lift space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[var(--accent)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Tổng kết GPA Toàn khóa (Môn → Học kỳ → Năm học → 4–6 năm)
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Tự động tính trọng số tín chỉ, quy đổi thang 4/chữ và mô phỏng học cải thiện.
            </p>
          </div>
        </div>
        {grades.length > 0 && (
          <button
            type="button"
            onClick={exportTranscriptCsv}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
          >
            <Download className="h-3.5 w-3.5" /> Xuất bảng điểm CSV
          </button>
        )}
      </div>

      {/* CPA Summary Row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">CPA Toàn khóa (4.0)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--accent)]">
            {overall.gpa4.toFixed(2)}
          </div>
          <div className={`text-[11px] font-semibold ${rank.color}`}>{rank.label}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">TB Toàn khóa (10)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
            {overall.gpa10.toFixed(2)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">{grades.length} học phần</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:col-span-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Tiến độ tín chỉ tốt nghiệp</span>
            <select
              value={programCredits}
              onChange={(e) => setProgramCredits(Number(e.target.value))}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] text-[var(--text-primary)]"
            >
              <option value={120}>4 năm (120 TC)</option>
              <option value={130}>4 năm (130 TC)</option>
              <option value={145}>4.5 năm (145 TC)</option>
              <option value={160}>5 năm Kỹ sư (160 TC)</option>
              <option value={200}>6 năm Y/Kiến trúc (200 TC)</option>
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

      {/* Multi-level view tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["year", `Theo Năm học (${byYear.length})`],
            ["semester", `Theo Học kỳ (${bySemester.length})`],
            ["course", `Chi tiết từng môn (${grades.length})`],
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
          Chưa có môn học nào. Hãy thêm điểm ở phần trên (ghi rõ học kỳ kiểu &quot;HK1 2024-2025&quot; hoặc &quot;Năm 1 - HK1&quot;) để hệ thống tự gom theo từng kỳ và từng năm học.
        </p>
      ) : groupMode === "course" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                <th className="py-2 pr-2">Môn học</th>
                <th className="py-2 pr-2">Học kỳ</th>
                <th className="py-2 pr-2 text-right">TC</th>
                <th className="py-2 pr-2 text-right">Hệ 10</th>
                <th className="py-2 pr-2 text-right">Hệ 4</th>
                <th className="py-2 text-right">Chữ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {grades.map((g) => (
                <tr key={g.id}>
                  <td className="py-2 pr-2 font-medium text-[var(--text-primary)]">{g.courseName}</td>
                  <td className="py-2 pr-2 text-[var(--text-muted)]">{g.semester}</td>
                  <td className="py-2 pr-2 text-right font-mono">{g.credits}</td>
                  <td className="py-2 pr-2 text-right font-mono">{g.score10.toFixed(1)}</td>
                  <td className="py-2 pr-2 text-right font-mono font-semibold text-[var(--accent)]">
                    {toGpa4(g.score10).toFixed(1)}
                  </td>
                  <td className="py-2 text-right font-mono font-bold">{toLetter(g.score10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(groupMode === "year" ? byYear : bySemester).map((grp) => {
            const c = classifyGpa4(grp.gpa4);
            return (
              <div
                key={grp.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--text-primary)]">{grp.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {grp.items.length} môn · {grp.credits} tín chỉ · Hệ 10: {grp.gpa10.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-bold text-[var(--accent)]">
                    {grp.gpa4.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-semibold ${c.color}`}>{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Retake & Future Credits CPA Simulator */}
      {grades.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Calculator className="h-3.5 w-3.5 text-[var(--accent)]" />
              Mô phỏng học cải thiện & các kỳ sắp tới
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--accent)]">
              <Award className="h-3.5 w-3.5" />
              CPA dự kiến: {simulated.gpa4.toFixed(2)}{" "}
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
              <span>GPA kỳ tới dự kiến (4.0)</span>
              <input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={futureGpa4}
                onChange={(e) => setFutureGpa4(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)]"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
