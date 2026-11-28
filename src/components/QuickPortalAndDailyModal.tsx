"use client";

import { getLocalDateIso } from "@/lib/utils";

import { kfNotify } from "@/lib/notify";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Camera,
  Copy,
  Download,
  ExternalLink,
  History,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import type { TodoItem } from "./SubjectTodoPanel";
import type { NoteRecord } from "./NotesFlashcardsPanel";
import type { SessionLogItem } from "./PomodoroTimer";
import type { ExamRecord } from "./DashboardBento";

interface PortalLink {
  id: string;
  name: string;
  url: string;
  tag: string;
}

interface NoteSnapshot {
  id: string;
  noteId: string;
  noteTitle: string;
  savedAt: string;
  content: string;
}

const PORTALS_KEY = "kronoflow-portal-links-v1";
const SNAPSHOTS_KEY = "kronoflow-note-snapshots-v1";

const DEFAULT_PORTALS: PortalLink[] = [
  { id: "p1", name: "GitHub — KronoFlow", url: "https://github.com/LoiHoRyan/Krono-Flow", tag: "Code" },
  { id: "p2", name: "Google Drive học tập", url: "https://drive.google.com", tag: "Tài liệu" },
  { id: "p3", name: "Google Scholar (Tra tài liệu)", url: "https://scholar.google.com", tag: "Nghiên cứu" },
];

export function QuickPortalAndDailyModal({
  open,
  onClose,
  todos,
  notes,
  sessions,
  exams,
}: {
  open: boolean;
  onClose: () => void;
  todos: TodoItem[];
  notes: NoteRecord[];
  sessions: SessionLogItem[];
  exams: ExamRecord[];
}) {
  const [tab, setTab] = useState<"portals" | "planpng" | "snapshots" | "quota">("portals");

  // 1. Portal Bookmarks
  const [portals, setPortals] = useState<PortalLink[]>(DEFAULT_PORTALS);
  const [pName, setPName] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [pTag, setPTag] = useState("Cổng trường");

  // 2. Daily Plan PNG
  const [pngDark, setPngDark] = useState(true);

  // 3. Note Snapshots
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");

  // 4. Daily Quota Auto-Pilot
  const [quotaUnits, setQuotaUnits] = useState(12);
  const [quotaUnitLabel, setQuotaUnitLabel] = useState("chương");
  const [quotaDays, setQuotaDays] = useState(6);

  useEffect(() => {
    if (!open) return;
    try {
      const rP = localStorage.getItem(PORTALS_KEY);
      if (rP) setPortals(JSON.parse(rP) as PortalLink[]);
      const rS = localStorage.getItem(SNAPSHOTS_KEY);
      if (rS) setSnapshots(JSON.parse(rS) as NoteSnapshot[]);
    } catch {
      // ignore
    }
  }, [open]);

  // Weekly Delta: last 7 days vs previous 7 days
  const weeklyDelta = useMemo(() => {
    const now = Date.now();
    const d7 = now - 7 * 86400000;
    const d14 = now - 14 * 86400000;
    const completed = sessions.filter((s) => s.status === "completed");
    const cur = completed.filter((s) => new Date(s.startedAt).getTime() >= d7);
    const prev = completed.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= d14 && t < d7;
    });
    const curMins = cur.reduce((a, b) => a + b.actualMinutes, 0);
    const prevMins = prev.reduce((a, b) => a + b.actualMinutes, 0);
    const pct = prevMins > 0 ? Math.round(((curMins - prevMins) / prevMins) * 100) : curMins > 0 ? 100 : 0;
    return {
      curHours: (curMins / 60).toFixed(1),
      prevHours: (prevMins / 60).toFixed(1),
      curCount: cur.length,
      prevCount: prev.length,
      pct,
    };
  }, [sessions]);

  if (!open) return null;

  const savePortals = (next: PortalLink[]) => {
    setPortals(next);
    try {
      localStorage.setItem(PORTALS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const saveSnapshots = (next: NoteSnapshot[]) => {
    setSnapshots(next);
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const pendingTodos = todos.filter((t) => !t.isCompleted).slice(0, 10);

  const downloadDailyPlanPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1040;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = pngDark ? "#0f172a" : "#f8fafc";
    ctx.fillRect(0, 0, 720, 1040);

    ctx.fillStyle = pngDark ? "#38bdf8" : "#2563eb";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("KRONOFLOW · KẾ HOẠCH HÔM NAY", 48, 76);

    ctx.fillStyle = pngDark ? "#94a3b8" : "#64748b";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(
      new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      48,
      110
    );

    const list = pendingTodos.length > 0 ? pendingTodos : [{ id: "0", title: "Hôm nay đã hoàn thành hết việc!", priority: "low" as const }];
    list.forEach((t, i) => {
      const y = 165 + i * 78;
      ctx.fillStyle = pngDark ? "#1e293b" : "#ffffff";
      ctx.fillRect(48, y, 624, 62);
      ctx.strokeStyle = pngDark ? "#334155" : "#e2e8f0";
      ctx.strokeRect(48, y, 624, 62);

      ctx.fillStyle = t.priority === "high" ? "#f43f5e" : t.priority === "medium" ? "#f59e0b" : "#10b981";
      ctx.fillRect(48, y, 8, 62);

      ctx.fillStyle = pngDark ? "#f8fafc" : "#0f172a";
      ctx.font = "600 20px system-ui, sans-serif";
      const label = t.title.length > 42 ? `${t.title.slice(0, 42)}…` : t.title;
      ctx.fillText(`☐  ${label}`, 74, y + 38);
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-daily-plan-${getLocalDateIso()}.png`;
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
            <Bookmark className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Cổng Học tập, Ảnh Kế hoạch Ngày, Mốc Ghi chú & Định mức Ôn
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
              ["portals", "Cổng Học tập", Bookmark],
              ["planpng", "Ảnh Kế hoạch PNG", Camera],
              ["snapshots", "Mốc Ghi chú", History],
              ["quota", "Định mức & So sánh Tuần", TrendingUp],
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

        {/* TAB 1: QUICK PORTAL BOOKMARKS */}
        {tab === "portals" && (
          <div className="mt-4 space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pName.trim() || !pUrl.trim()) return;
                savePortals([
                  { id: `pl-${Date.now()}`, name: pName.trim(), url: pUrl.trim(), tag: pTag.trim() || "Link" },
                  ...portals,
                ]);
                setPName("");
                setPUrl("");
              }}
              className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-4"
            >
              <input
                type="text"
                required
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Tên cổng (VD: Cổng xem điểm)..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="url"
                required
                value={pUrl}
                onChange={(e) => setPUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 sm:col-span-2"
              />
              <button type="submit" className="btn-primary inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Ghim link
              </button>
            </form>

            <div className="grid gap-2 sm:grid-cols-2">
              {portals.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2.5"
                >
                  <a
                    href={pl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2 hover:text-[var(--accent)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--text-primary)]">{pl.name}</div>
                      <div className="truncate text-[10px] text-[var(--text-muted)]">{pl.url}</div>
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => savePortals(portals.filter((x) => x.id !== pl.id))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: DAILY PLAN PNG */}
        {tab === "planpng" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Xuất ảnh Checklist {pendingTodos.length} việc hôm nay (tỉ lệ điện thoại)
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Tiện đặt làm màn hình khóa điện thoại hoặc gửi nhóm học đầu ngày.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPngDark((v) => !v)}
                  className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-[11px]"
                >
                  Nền: {pngDark ? "Tối (Dark)" : "Sáng (Light)"}
                </button>
                <button
                  type="button"
                  onClick={downloadDailyPlanPng}
                  className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-medium"
                >
                  <Download className="h-3.5 w-3.5" /> Tải Ảnh (.PNG)
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {pendingTodos.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-[11px]"
                >
                  ☐ {t.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: NOTE SNAPSHOTS */}
        {tab === "snapshots" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="min-w-[180px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              >
                <option value="">Chọn ghi chú để lưu mốc dự phòng...</option>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedNoteId}
                onClick={() => {
                  const target = notes.find((n) => n.id === selectedNoteId);
                  if (!target) return;
                  const snap: NoteSnapshot = {
                    id: `sn-${Date.now()}`,
                    noteId: target.id,
                    noteTitle: target.title,
                    savedAt: new Date().toLocaleString("vi-VN"),
                    content: target.content,
                  };
                  saveSnapshots([snap, ...snapshots].slice(0, 15));
                }}
                className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50"
              >
                <History className="h-3.5 w-3.5" /> Lưu mốc ngay
              </button>
            </div>
            {snapshots.length === 0 ? (
              <p className="py-4 text-center text-[var(--text-muted)]">
                Chưa có mốc khôi phục nào. Hãy lưu mốc trước khi chỉnh sửa lớn một ghi chú dài!
              </p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((sn) => (
                  <div key={sn.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">{sn.noteTitle}</span>
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">{sn.savedAt}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(sn.content).catch(() => {});
                            kfNotify("Đã sao chép nội dung bản dự phòng để dán khôi phục!");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--accent)]"
                        >
                          <Copy className="h-3 w-3" /> Chép khôi phục
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSnapshots(snapshots.filter((x) => x.id !== sn.id))}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-muted)]">{sn.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DAILY QUOTA AUTO-PILOT & WEEKLY DELTA */}
        {tab === "quota" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                So sánh Nhịp học 7 ngày qua vs 7 ngày trước đó
              </div>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
                  <div className="text-[10px] text-[var(--text-muted)]">7 ngày gần nhất</div>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[var(--accent)]">
                    {weeklyDelta.curHours}h ({weeklyDelta.curCount} phiên)
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
                  <div className="text-[10px] text-[var(--text-muted)]">7 ngày trước đó</div>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[var(--text-primary)]">
                    {weeklyDelta.prevHours}h ({weeklyDelta.prevCount} phiên)
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--bg-surface)] p-2.5">
                  <div className="text-[10px] text-[var(--text-muted)]">Biến động</div>
                  <div
                    className={`mt-0.5 font-mono text-lg font-bold ${
                      weeklyDelta.pct >= 0 ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {weeklyDelta.pct >= 0 ? `+${weeklyDelta.pct}%` : `${weeklyDelta.pct}%`}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <Target className="h-4 w-4 text-emerald-500" />
                Định mức ôn mỗi ngày đến ngày thi (Daily Quota Auto-Pilot)
              </div>
              {exams.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {exams.slice(0, 4).map((ex) => {
                    const d = Math.max(1, Math.ceil((new Date(ex.examDate).getTime() - Date.now()) / 86400000));
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setQuotaDays(d)}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] hover:border-[var(--accent)]"
                      >
                        {ex.title} ({d} ngày)
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  min={1}
                  value={quotaUnits}
                  onChange={(e) => setQuotaUnits(Math.max(1, Number(e.target.value)))}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono"
                />
                <input
                  type="text"
                  value={quotaUnitLabel}
                  onChange={(e) => setQuotaUnitLabel(e.target.value)}
                  placeholder="Đơn vị (chương / đề / trang)"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
                />
                <input
                  type="number"
                  min={1}
                  value={quotaDays}
                  onChange={(e) => setQuotaDays(Math.max(1, Number(e.target.value)))}
                  title="Số ngày còn lại"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono"
                />
              </div>
              <div className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 font-medium text-[var(--accent)]">
                Định mức hôm nay:{" "}
                <strong className="font-mono text-sm">
                  {(quotaUnits / Math.max(1, quotaDays)).toFixed(1)} {quotaUnitLabel}/ngày
                </strong>{" "}
                (làm tròn lên: <strong>{Math.ceil(quotaUnits / Math.max(1, quotaDays))}</strong> {quotaUnitLabel})
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
