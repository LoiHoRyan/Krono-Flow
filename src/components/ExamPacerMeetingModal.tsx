"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  FileText,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Terminal,
  Timer,
  Trash2,
  X,
} from "lucide-react";

interface ExamSection {
  id: string;
  name: string;
  minutes: number;
}

interface ActionRow {
  id: string;
  owner: string;
  task: string;
  due: string;
}

interface CmdSnippet {
  id: string;
  tag: string;
  title: string;
  code: string;
}

const SNIPPETS_KEY = "kronoflow-cmd-snippets-v1";
const DEFAULT_SNIPPETS: CmdSnippet[] = [
  {
    id: "sn1",
    tag: "Git",
    title: "Kiểm tra build & đẩy code lên GitHub",
    code: "npm run build && git add . && git commit -m \"feat: update\" && git push origin main",
  },
  {
    id: "sn2",
    tag: "Git",
    title: "Hoàn tác commit gần nhất (giữ nguyên file đã sửa)",
    code: "git reset --soft HEAD~1",
  },
  {
    id: "sn3",
    tag: "Docker",
    title: "Khởi động lại PostgreSQL container cục bộ",
    code: "docker compose up -d",
  },
];

export function ExamPacerMeetingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"pacer" | "minutes" | "snippets">("pacer");

  // 1. Multi-Section Exam Pacer
  const [sections, setSections] = useState<ExamSection[]>([
    { id: "s1", name: "Phần 1: Trắc nghiệm", minutes: 30 },
    { id: "s2", name: "Phần 2: Tự luận", minutes: 45 },
    { id: "s3", name: "Phần 3: Soát lại bài", minutes: 15 },
  ]);
  const [newSecName, setNewSecName] = useState("");
  const [newSecMins, setNewSecMins] = useState(20);
  const [secIdx, setSecIdx] = useState(0);
  const [secsLeft, setSecsLeft] = useState(30 * 60);
  const [running, setRunning] = useState(false);

  // 2. Meeting Minutes Builder
  const [mTitle, setMTitle] = useState("Họp nhóm Đồ án cuối kỳ");
  const [mMembers, setMMembers] = useState("An, Bình, Chi");
  const [mDecisions, setMDecisions] = useState("Chốt đề tài, phân chia module và thống nhất deadline báo cáo.");
  const [mActions, setMActions] = useState<ActionRow[]>([
    { id: "a1", owner: "An", task: "Hoàn thiện slide mở đầu", due: "Thứ 6" },
  ]);
  const [aOwner, setAOwner] = useState("");
  const [aTask, setATask] = useState("");
  const [aDue, setADue] = useState("");

  // 3. Custom Command Snippets
  const [snippets, setSnippets] = useState<CmdSnippet[]>(DEFAULT_SNIPPETS);
  const [snTag, setSnTag] = useState("Git");
  const [snTitle, setSnTitle] = useState("");
  const [snCode, setSnCode] = useState("");
  const [snQuery, setSnQuery] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SNIPPETS_KEY);
      if (raw) setSnippets(JSON.parse(raw) as CmdSnippet[]);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!running || !open) return;
    const id = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          const nextIdx = secIdx + 1;
          const nextSec = sections[nextIdx];
          if (nextSec) {
            setSecIdx(nextIdx);
            return nextSec.minutes * 60;
          }
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, open, secIdx, sections]);

  if (!open) return null;

  const saveSnippets = (next: CmdSnippet[]) => {
    setSnippets(next);
    try {
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const activeSec = sections[secIdx] ?? sections[0] ?? null;
  const resetPacer = () => {
    setRunning(false);
    setSecIdx(0);
    setSecsLeft((sections[0]?.minutes ?? 30) * 60);
  };

  const copyMinutesMarkdown = () => {
    const today = new Date().toLocaleDateString("vi-VN");
    const md = [
      `# Biên bản họp: ${mTitle} (${today})`,
      `**Thành viên tham gia:** ${mMembers}`,
      "",
      `## Nội dung đã thống nhất`,
      mDecisions,
      "",
      `## Phân công công việc`,
      `| Phụ trách | Công việc | Hạn chót |`,
      `| --- | --- | --- |`,
      ...mActions.map((a) => `| ${a.owner} | ${a.task} | ${a.due} |`),
    ].join("\n");
    navigator.clipboard?.writeText(md).catch(() => {});
    window.alert("Đã sao chép biên bản họp Markdown để dán vào Zalo/Notion!");
  };

  const filteredSnippets = snippets.filter((s) => {
    const q = snQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.tag.toLowerCase().includes(q)
    );
  });

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
            <Timer className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Chia chặng Bài thi, Biên bản Họp nhóm & Kho Lệnh Cá nhân
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
              ["pacer", "Chia chặng Bài thi", Timer],
              ["minutes", "Biên bản Họp nhóm", FileText],
              ["snippets", "Kho Lệnh & Phím tắt", Terminal],
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

        {/* TAB 1: MULTI-SECTION EXAM PACER */}
        {tab === "pacer" && (
          <div className="mt-4 space-y-3 text-xs">
            {(() => {
              const totalSec = Math.max(1, (activeSec?.minutes ?? 30) * 60);
              const ratioLeft = secsLeft / totalSec;
              const warnCls =
                secsLeft <= 300 || ratioLeft <= 0.25
                  ? "border-rose-500/45 bg-rose-500/12"
                  : ratioLeft <= 0.5
                  ? "border-amber-500/45 bg-amber-500/12"
                  : "border-[var(--accent)]/35 bg-[var(--accent-soft)]";
              return (
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${warnCls}`}>
              <div>
                <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Chặng {secIdx + 1}/{sections.length}: <strong>{activeSec?.name ?? "Hoàn tất"}</strong>
                </div>
                <div className="mt-1 font-mono text-4xl font-bold tabular-nums text-[var(--text-primary)]">
                  {String(Math.floor(secsLeft / 60)).padStart(2, "0")}:
                  {String(secsLeft % 60).padStart(2, "0")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
                >
                  {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {running ? "Tạm dừng" : "Bắt đầu thi"}
                </button>
                <button
                  type="button"
                  onClick={resetPacer}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)]"
                  title="Đặt lại từ chặng 1"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
              );
            })()}

            <div className="space-y-1.5">
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                    i === secIdx
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/50"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSecIdx(i);
                      setSecsLeft(s.minutes * 60);
                    }}
                    className="flex-1 text-left font-medium text-[var(--text-primary)]"
                  >
                    {i + 1}. {s.name}
                  </button>
                  <span className="font-mono text-[var(--accent)]">{s.minutes} phút</span>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSections((prev) => prev.filter((x) => x.id !== s.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSecName.trim()) return;
                setSections((prev) => [
                  ...prev,
                  { id: `sec-${Date.now()}`, name: newSecName.trim(), minutes: Math.max(1, newSecMins) },
                ]);
                setNewSecName("");
              }}
              className="flex flex-wrap gap-1.5"
            >
              <input
                type="text"
                value={newSecName}
                onChange={(e) => setNewSecName(e.target.value)}
                placeholder="Thêm chặng mới (VD: Phần 4: Bài tập lập trình)..."
                className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5"
              />
              <input
                type="number"
                min={1}
                max={180}
                value={newSecMins}
                onChange={(e) => setNewSecMins(Number(e.target.value))}
                className="w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono"
              />
              <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Thêm chặng
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: MEETING MINUTES BUILDER */}
        {tab === "minutes" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-2">
              <input
                type="text"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="Tiêu đề buổi họp..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={mMembers}
                onChange={(e) => setMMembers(e.target.value)}
                placeholder="Thành viên tham gia..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <textarea
                rows={2}
                value={mDecisions}
                onChange={(e) => setMDecisions(e.target.value)}
                placeholder="Nội dung đã chốt..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 sm:col-span-2"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!aOwner.trim() || !aTask.trim()) return;
                setMActions((prev) => [
                  ...prev,
                  { id: `act-${Date.now()}`, owner: aOwner.trim(), task: aTask.trim(), due: aDue.trim() || "Tuần này" },
                ]);
                setAOwner("");
                setATask("");
                setADue("");
              }}
              className="grid gap-1.5 sm:grid-cols-4"
            >
              <input
                type="text"
                required
                value={aOwner}
                onChange={(e) => setAOwner(e.target.value)}
                placeholder="Người phụ trách..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              />
              <input
                type="text"
                required
                value={aTask}
                onChange={(e) => setATask(e.target.value)}
                placeholder="Nhiệm vụ cụ thể..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={aDue}
                onChange={(e) => setADue(e.target.value)}
                placeholder="Hạn chót..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              />
              <button type="submit" className="btn-primary rounded-lg px-3 py-1.5 font-medium">
                + Thêm việc
              </button>
            </form>

            <div className="space-y-1">
              {mActions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5"
                >
                  <span>
                    <strong>{a.owner}:</strong> {a.task}{" "}
                    <span className="text-[10px] text-[var(--text-muted)]">({a.due})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMActions((p) => p.filter((x) => x.id !== a.id))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyMinutesMarkdown}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                <Copy className="h-3.5 w-3.5" /> Chép Biên bản Markdown
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM COMMAND SNIPPETS */}
        {tab === "snippets" && (
          <div className="mt-4 space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!snTitle.trim() || !snCode.trim()) return;
                saveSnippets([
                  { id: `sn-${Date.now()}`, tag: snTag.trim() || "Lệnh", title: snTitle.trim(), code: snCode.trim() },
                  ...snippets,
                ]);
                setSnTitle("");
                setSnCode("");
              }}
              className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={snTag}
                  onChange={(e) => setSnTag(e.target.value)}
                  placeholder="Nhóm (Git, SQL, C++, Excel...)"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
                />
                <input
                  type="text"
                  required
                  value={snTitle}
                  onChange={(e) => setSnTitle(e.target.value)}
                  placeholder="Mô tả lệnh / phím tắt..."
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 sm:col-span-2"
                />
              </div>
              <input
                type="text"
                required
                value={snCode}
                onChange={(e) => setSnCode(e.target.value)}
                placeholder="Câu lệnh / phím tắt cần lưu..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px]"
              />
              <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Lưu lệnh
              </button>
            </form>

            <input
              type="text"
              value={snQuery}
              onChange={(e) => setSnQuery(e.target.value)}
              placeholder="Tìm nhanh lệnh Git, SQL, Docker..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5"
            />

            <div className="space-y-2">
              {filteredSnippets.map((s) => (
                <div key={s.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent)]">
                        {s.tag}
                      </span>
                      <span className="ml-2 font-medium text-[var(--text-primary)]">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(s.code).catch(() => {})}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                        title="Sao chép lệnh"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSnippets(snippets.filter((x) => x.id !== s.id))}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <pre className="mt-1.5 overflow-x-auto rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--accent)]">
                    {s.code}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
