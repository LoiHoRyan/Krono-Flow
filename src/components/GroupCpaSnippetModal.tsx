"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Code2,
  Copy,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { kfNotify } from "@/lib/notify";
import { getLocalDateIso, normalizeVi } from "@/lib/utils";

interface GroupTask {
  id: string;
  member: string;
  task: string;
  due: string;
  status: "todo" | "doing" | "done";
}

interface QuickSnippet {
  id: string;
  title: string;
  tag: string;
  body: string;
}

const GROUP_KEY = "kronoflow-group-tasks-v1";
const SNIPPET_KEY = "kronoflow-quick-snippets-v1";

function score10ToLetter(s10: number): string {
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

export function GroupCpaSnippetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"group" | "cpa" | "snippets">("group");

  // TAB 1: Group Task Matrix
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [member, setMember] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [due, setDue] = useState(getLocalDateIso());

  // TAB 2: CPA Recovery & Linear 4.0 Scale Converter
  const [curCpa, setCurCpa] = useState(3.1);
  const [curCredits, setCurCredits] = useState(45);
  const [targetCpa, setTargetCpa] = useState(3.4);
  const [futureAvg, setFutureAvg] = useState(3.7);
  const [convScore10, setConvScore10] = useState(8.5);

  // TAB 3: Quick Reference Snippets
  const [snippets, setSnippets] = useState<QuickSnippet[]>([]);
  const [snipTitle, setSnipTitle] = useState("");
  const [snipTag, setSnipTag] = useState("Công thức");
  const [snipBody, setSnipBody] = useState("");
  const [snipQuery, setSnipQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      const rawG = localStorage.getItem(GROUP_KEY);
      if (rawG) setTasks(JSON.parse(rawG) as GroupTask[]);
      const rawS = localStorage.getItem(SNIPPET_KEY);
      if (rawS) setSnippets(JSON.parse(rawS) as QuickSnippet[]);
    } catch {
      // ignore
    }
  }, [open]);

  const saveTasks = (next: GroupTask[]) => {
    setTasks(next);
    try {
      localStorage.setItem(GROUP_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const saveSnippets = (next: QuickSnippet[]) => {
    setSnippets(next);
    try {
      localStorage.setItem(SNIPPET_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addGroupTask = () => {
    if (!member.trim() || !taskTitle.trim()) return;
    saveTasks([
      { id: `gt-${Date.now()}`, member: member.trim(), task: taskTitle.trim(), due, status: "todo" },
      ...tasks,
    ]);
    setTaskTitle("");
    kfNotify("Đã thêm đầu việc nhóm!");
  };

  const copyGroupMarkdown = () => {
    const statusMap: Record<GroupTask["status"], string> = {
      todo: "⬜ Chưa làm",
      doing: "🟨 Đang làm",
      done: "✅ Đã xong",
    };
    const lines = [
      `### Tiến độ Bài tập Nhóm (${getLocalDateIso()})`,
      "| Thành viên | Đầu việc | Hạn | Trạng thái |",
      "|---|---|---|---|",
      ...tasks.map((t) => `| ${t.member} | ${t.task} | ${t.due} | ${statusMap[t.status]} |`),
    ];
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    kfNotify("Đã sao chép bảng tiến độ nhóm Markdown!");
  };

  const addSnippet = () => {
    if (!snipTitle.trim() || !snipBody.trim()) return;
    saveSnippets([
      { id: `sn-${Date.now()}`, title: snipTitle.trim(), tag: snipTag.trim() || "Chung", body: snipBody.trim() },
      ...snippets,
    ]);
    setSnipTitle("");
    setSnipBody("");
    kfNotify("Đã lưu mẫu tra nhanh!");
  };

  const filteredSnippets = useMemo(() => {
    const q = normalizeVi(snipQuery.trim());
    if (!q) return snippets;
    return snippets.filter((s) => normalizeVi(`${s.title} ${s.tag} ${s.body}`).includes(q));
  }, [snippets, snipQuery]);

  if (!open) return null;

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const donePct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  // CPA Recovery formula: (curCpa*curCredits + futureAvg*X) / (curCredits + X) >= targetCpa
  // => X >= curCredits * (targetCpa - curCpa) / (futureAvg - targetCpa)
  const cpaGap = targetCpa - curCpa;
  const denom = futureAvg - targetCpa;
  const neededCredits = cpaGap <= 0 ? 0 : denom <= 0 ? null : Math.ceil((curCredits * cpaGap) / denom);

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
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Chia việc Nhóm · Kéo CPA · Kho Mẫu Tra Nhanh</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Theo dõi bài tập lớn, tính tín chỉ kéo CPA và lưu nhanh định lý / đoạn code
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
            onClick={() => setTab("group")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "group" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Việc nhóm ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("cpa")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "cpa" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Calculator className="h-3.5 w-3.5" /> Kéo CPA
          </button>
          <button
            type="button"
            onClick={() => setTab("snippets")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "snippets" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" /> Mẫu nhanh ({snippets.length})
          </button>
        </div>

        {/* TAB 1: GROUP TASK MATRIX */}
        {tab === "group" && (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:grid-cols-4">
              <input
                value={member}
                onChange={(e) => setMember(e.target.value)}
                placeholder="Tên thành viên..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
              />
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Đầu việc phụ trách..."
                className="sm:col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
              />
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={addGroupTask}
                className="btn-primary sm:col-span-3 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm đầu việc
              </button>
              <button
                type="button"
                onClick={copyGroupMarkdown}
                disabled={tasks.length === 0}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" /> Chép MD
              </button>
            </div>

            {tasks.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-600">
                  {doneCount}/{tasks.length} ({donePct}%)
                </span>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                Chưa có đầu việc nhóm nào. Thêm thành viên và việc phụ trách ở trên.
              </p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[var(--text-primary)]">{t.task}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Phụ trách: <strong>{t.member}</strong> · Hạn: {t.due}
                      </p>
                    </div>
                    <select
                      value={t.status}
                      onChange={(e) =>
                        saveTasks(
                          tasks.map((x) =>
                            x.id === t.id ? { ...x, status: e.target.value as GroupTask["status"] } : x
                          )
                        )
                      }
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-semibold"
                    >
                      <option value="todo">Chưa làm</option>
                      <option value="doing">Đang làm</option>
                      <option value="done">Đã xong</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => saveTasks(tasks.filter((x) => x.id !== t.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CPA RECOVERY & LINEAR 4.0 SCALE CONVERTER */}
        {tab === "cpa" && (
          <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">CPA hiện tại (hệ 4.0)</span>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  max={4}
                  value={curCpa}
                  onChange={(e) => setCurCpa(Math.max(0, Math.min(4, Number(e.target.value) || 0)))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">Tổng tín chỉ đã tích lũy</span>
                <input
                  type="number"
                  min={1}
                  max={250}
                  value={curCredits}
                  onChange={(e) => setCurCredits(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">CPA mục tiêu muốn đạt</span>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={4}
                  value={targetCpa}
                  onChange={(e) => setTargetCpa(Math.max(0, Math.min(4, Number(e.target.value) || 0)))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">GPA dự kiến các kỳ tới (VD: 3.70)</span>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={4}
                  value={futureAvg}
                  onChange={(e) => setFutureAvg(Math.max(0, Math.min(4, Number(e.target.value) || 0)))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/40 p-3.5 text-xs">
              {neededCredits === 0 ? (
                <p className="font-bold text-emerald-600">
                  CPA hiện tại ({curCpa.toFixed(2)}) đã đạt hoặc vượt mục tiêu {targetCpa.toFixed(2)}!
                </p>
              ) : neededCredits === null ? (
                <p className="font-bold text-rose-600">
                  GPA dự kiến ({futureAvg.toFixed(2)}) phải lớn hơn CPA mục tiêu ({targetCpa.toFixed(2)}) thì mới kéo lên được.
                </p>
              ) : (
                <p className="font-semibold text-[var(--text-primary)]">
                  Để kéo CPA từ <strong>{curCpa.toFixed(2)}</strong> lên <strong>{targetCpa.toFixed(2)}</strong> (với mức học mới trung bình{" "}
                  <strong>{futureAvg.toFixed(2)}</strong>), bạn cần tích lũy thêm ít nhất{" "}
                  <strong className="font-mono text-sm text-[var(--accent)]">{neededCredits} tín chỉ</strong>.
                </p>
              )}
            </div>

            {/* Instant Linear 4.0 Scale Converter */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 text-xs">
              <p className="mb-2 font-bold">Quy đổi nhanh Hệ 10 ↔ Hệ 4 Tuyến tính (× 0.4) ↔ Điểm chữ</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={convScore10}
                  onChange={(e) => setConvScore10(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                  className="w-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-sm font-bold outline-none"
                />
                <span className="text-[var(--text-muted)]">Hệ 4 tuyến tính:</span>
                <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-sm font-bold text-[var(--accent)]">
                  {(convScore10 * 0.4).toFixed(3)}
                </span>
                <span className="text-[var(--text-muted)]">Điểm chữ:</span>
                <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 font-mono text-sm font-bold text-emerald-600">
                  {score10ToLetter(convScore10)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUICK REFERENCE SNIPPETS */}
        {tab === "snippets" && (
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
              <div className="flex gap-2">
                <input
                  value={snipTitle}
                  onChange={(e) => setSnipTitle(e.target.value)}
                  placeholder="Tên định lý / mẫu code / câu mẫu..."
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
                />
                <input
                  value={snipTag}
                  onChange={(e) => setSnipTag(e.target.value)}
                  placeholder="Nhãn (VD: C++, SQL)"
                  className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
              <textarea
                rows={3}
                value={snipBody}
                onChange={(e) => setSnipBody(e.target.value)}
                placeholder="Nội dung công thức, định lý hoặc đoạn code mẫu..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 font-mono text-xs outline-none"
              />
              <button
                type="button"
                onClick={addSnippet}
                className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Lưu mẫu tra nhanh
              </button>
            </div>

            {snippets.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  value={snipQuery}
                  onChange={(e) => setSnipQuery(e.target.value)}
                  placeholder="Lọc nhanh theo tên, nhãn hoặc nội dung..."
                  className="flex-1 bg-transparent text-xs outline-none"
                />
              </div>
            )}

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {filteredSnippets.length === 0 ? (
                <p className="py-5 text-center text-xs text-[var(--text-muted)]">
                  Chưa có mẫu tra nhanh nào phù hợp.
                </p>
              ) : (
                filteredSnippets.map((sn) => (
                  <div
                    key={sn.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3 text-xs"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                          {sn.tag}
                        </span>
                        <span className="font-bold">{sn.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(sn.body).catch(() => {});
                            kfNotify(`Đã sao chép "${sn.title}"!`);
                          }}
                          className="rounded-md bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-semibold hover:text-[var(--accent)]"
                        >
                          <Copy className="inline h-3 w-3" /> Chép
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSnippets(snippets.filter((x) => x.id !== sn.id))}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--bg-surface)] p-2 font-mono text-[11px] text-[var(--text-secondary)]">
                      {sn.body}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
