"use client";

import { kfNotify } from "@/lib/notify";

import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  FileDiff,
  Repeat,
  Sparkles,
  X,
} from "lucide-react";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { GradeRecord } from "./ScheduleGpaPanel";
import type { TodoItem } from "./SubjectTodoPanel";

function isConditionCourse(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("thể chất") || n.includes("quốc phòng") || n.includes("gdtc") || n.includes("gdqp");
}

interface DiffLine {
  kind: "same" | "add" | "del";
  text: string;
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split(/\r?\n/);
  const b = newText.split(/\r?\n/);
  const setA = new Set(a);
  const setB = new Set(b);
  const out: DiffLine[] = [];
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const la = a[i];
    const lb = b[i];
    if (la === lb && la !== undefined) {
      out.push({ kind: "same", text: la });
    } else {
      if (la !== undefined && !setB.has(la)) out.push({ kind: "del", text: la });
      if (lb !== undefined && !setA.has(lb)) out.push({ kind: "add", text: lb });
      else if (lb !== undefined && la !== lb) out.push({ kind: "same", text: lb });
    }
  }
  return out;
}

export function WrappedDiffRotationModal({
  open,
  onClose,
  userName,
  sessions,
  subjects,
  grades,
  todos,
  flashcardCount,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  sessions: SessionLogItem[];
  subjects: SubjectOption[];
  grades: GradeRecord[];
  todos: TodoItem[];
  flashcardCount: number;
}) {
  const [tab, setTab] = useState<"wrapped" | "diff" | "rotation">("wrapped");

  // 2. Quick Text Diff Viewer
  const [oldDraft, setOldDraft] = useState("Lạm phát cầu kéo xảy ra khi tổng cầu tăng nhanh.\nNgân hàng trung ương giữ nguyên lãi suất.");
  const [newDraft, setNewDraft] = useState("Lạm phát cầu kéo xảy ra khi tổng cầu tăng vượt quá năng lực sản xuất.\nNgân hàng trung ương nâng lãi suất điều hành để kiềm chế lạm phát.");

  // 3. Team Rotation Planner
  const [teamRaw, setTeamRaw] = useState("An, Bình, Chi, Dũng");
  const [roleTitle, setRoleTitle] = useState("Thuyết trình & Tổng hợp biên bản");
  const [weeks, setWeeks] = useState(8);

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    const totalMins = completed.reduce((a, b) => a + b.actualMinutes, 0);
    const totalHours = (totalMins / 60).toFixed(1);

    const bySub = new Map<string, number>();
    for (const s of completed) {
      if (!s.subjectId) continue;
      bySub.set(s.subjectId, (bySub.get(s.subjectId) ?? 0) + s.actualMinutes);
    }
    const topSubEntry = [...bySub.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSubName = topSubEntry
      ? (subjects.find((s) => s.id === topSubEntry[0])?.name ?? "Tự học")
      : "Tự học";

    const validGrades = grades.filter(
      (g) => g.credits > 0 && g.score10 > 0 && !isConditionCourse(g.courseName)
    );
    const totCr = validGrades.reduce((a, b) => a + b.credits, 0);
    const cpa4 =
      totCr > 0
        ? Number(
            (
              validGrades.reduce((a, b) => a + b.score10 * 0.4 * b.credits, 0) / totCr
            ).toFixed(4)
          )
        : 0;
    const doneTodos = todos.filter((t) => t.isCompleted).length;
    return {
      totalHours,
      sessionCount: completed.length,
      topSubName,
      cpa4,
      doneTodos,
      totCr,
    };
  }, [sessions, subjects, grades, todos]);

  const diffLines = useMemo(() => computeLineDiff(oldDraft, newDraft), [oldDraft, newDraft]);

  const rotationRows = useMemo(() => {
    const members = teamRaw
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (members.length === 0) return [];
    return Array.from({ length: Math.min(20, Math.max(1, weeks)) }, (_, i) => ({
      week: i + 1,
      member: members[i % members.length] ?? "",
      backup: members[(i + 1) % members.length] ?? "",
    }));
  }, [teamRaw, weeks]);

  if (!open) return null;

  const exportWrappedPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 960, 540);
    grad.addColorStop(0, "#090d16");
    grad.addColorStop(0.55, "#172554");
    grad.addColorStop(1, "#312e81");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 540);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(36, 36, 888, 468);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText("KRONOFLOW · SEMESTER WRAPPED", 72, 90);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px system-ui, sans-serif";
    ctx.fillText(userName || "KronoFlow Scholar", 72, 146);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(
      `Môn học chăm nhất: ${stats.topSubName} · Cập nhật ${new Date().toLocaleDateString("vi-VN")}`,
      72,
      184
    );

    const tiles = [
      { label: "TỔNG GIỜ TẬP TRUNG", val: `${stats.totalHours}h`, sub: `${stats.sessionCount} phiên` },
      { label: "CPA HỆ 4 THỰC", val: stats.cpa4 > 0 ? String(stats.cpa4) : "—", sub: `${stats.totCr} tín chỉ` },
      { label: "VIỆC ĐÃ HOÀN THÀNH", val: String(stats.doneTodos), sub: "Nhiệm vụ xong" },
      { label: "BỘ THẺ FLASHCARD", val: String(flashcardCount), sub: "Thẻ ôn tập" },
    ];
    tiles.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 72 + col * 416;
      const y = 224 + row * 126;
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      ctx.fillRect(x, y, 392, 108);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(t.label, x + 20, y + 32);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px ui-monospace, monospace";
      ctx.fillText(t.val, x + 20, y + 78);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(t.sub, x + 210, y + 76);
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-semester-wrapped-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
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
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Tổng kết Học kỳ (Wrapped), So sánh Văn bản (Diff) & Lịch Xoay vòng Nhóm
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
              ["wrapped", "Tổng kết Học kỳ (.PNG)", Sparkles],
              ["diff", "So sánh Văn bản / Code", FileDiff],
              ["rotation", "Lịch Xoay vòng Nhóm", Repeat],
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

        {/* TAB 1: SEMESTER WRAPPED */}
        {tab === "wrapped" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-5 text-white shadow-xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">
                KronoFlow · Semester Wrapped
              </div>
              <div className="mt-1 text-xl font-bold">{userName || "KronoFlow Scholar"}</div>
              <div className="mt-0.5 text-xs text-slate-300">
                Môn học chăm chỉ nhất: <strong className="text-white">{stats.topSubName}</strong>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-[10px] text-slate-300">Tổng giờ học</div>
                  <div className="mt-1 font-mono text-xl font-bold">{stats.totalHours}h</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-[10px] text-slate-300">CPA hệ 4 thực</div>
                  <div className="mt-1 font-mono text-xl font-bold text-sky-300">
                    {stats.cpa4 > 0 ? stats.cpa4 : "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-[10px] text-slate-300">Việc đã xong</div>
                  <div className="mt-1 font-mono text-xl font-bold text-emerald-300">{stats.doneTodos}</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="text-[10px] text-slate-300">Flashcards</div>
                  <div className="mt-1 font-mono text-xl font-bold text-amber-300">{flashcardCount}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={exportWrappedPng}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" /> Tải Ảnh Tổng kết Học kỳ (.PNG)
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: QUICK TEXT DIFF VIEWER */}
        {tab === "diff" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">Bản cũ (Original)</label>
                <textarea
                  rows={5}
                  value={oldDraft}
                  onChange={(e) => setOldDraft(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 font-mono text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">Bản mới (Updated)</label>
                <textarea
                  rows={5}
                  value={newDraft}
                  onChange={(e) => setNewDraft(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 font-mono text-[11px]"
                />
              </div>
            </div>
            <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 font-mono text-[11px]">
              <div className="mb-1.5 text-[10px] font-sans font-semibold uppercase text-[var(--text-muted)]">
                Kết quả đối chiếu từng dòng (Xanh: thêm mới · Đỏ: đã xóa)
              </div>
              {diffLines.map((ln, idx) => (
                <div
                  key={idx}
                  className={
                    ln.kind === "add"
                      ? "rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
                      : ln.kind === "del"
                      ? "rounded bg-rose-500/15 px-2 py-0.5 text-rose-600 line-through dark:text-rose-400"
                      : "px-2 py-0.5 text-[var(--text-secondary)]"
                  }
                >
                  {ln.kind === "add" ? "+ " : ln.kind === "del" ? "- " : "  "}
                  {ln.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TEAM ROTATION PLANNER */}
        {tab === "rotation" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-4">
              <input
                type="text"
                value={teamRaw}
                onChange={(e) => setTeamRaw(e.target.value)}
                placeholder="Tên thành viên (cách nhau dấu phẩy)..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 sm:col-span-2"
              />
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Vai trò xoay vòng..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="number"
                min={2}
                max={20}
                value={weeks}
                onChange={(e) => setWeeks(Math.min(20, Math.max(2, Number(e.target.value))))}
                title="Số tuần"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono"
              />
            </div>

            {rotationRows.length > 0 && (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const md = [
                        `### Lịch xoay vòng: ${roleTitle}`,
                        `| Tuần | Phụ trách chính | Hỗ trợ dự phòng |`,
                        `| --- | --- | --- |`,
                        ...rotationRows.map((r) => `| Tuần ${r.week} | ${r.member} | ${r.backup} |`),
                      ].join("\n");
                      navigator.clipboard?.writeText(md).catch(() => {});
                      kfNotify("Đã sao chép bảng lịch xoay vòng Markdown!");
                    }}
                    className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                  >
                    <Copy className="h-3.5 w-3.5" /> Chép Markdown gửi nhóm
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rotationRows.map((r) => (
                    <div
                      key={r.week}
                      className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                    >
                      <span className="font-mono font-semibold text-[var(--accent)]">Tuần {r.week}</span>
                      <span className="font-medium text-[var(--text-primary)]">{r.member}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Hỗ trợ: {r.backup}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
