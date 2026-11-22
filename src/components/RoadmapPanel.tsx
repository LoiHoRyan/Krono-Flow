"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, Download, Map, Plus, Sparkles, Trash2, Upload,
  Maximize2,
} from "lucide-react";
import { ROADMAP_TEMPLATES } from "@/lib/roadmap-templates";
import { playUiTick } from "@/lib/ui-sounds";

export interface RoadmapItemRecord {
  id: string;
  title: string;
  estimatedMinutes: number;
  status: "todo" | "in_progress" | "done";
}

export interface RoadmapRecord {
  id: string;
  title: string;
  category: string;
  items: RoadmapItemRecord[];
}

export function RoadmapPanel({
  roadmaps,
  onRefresh,
}: {
  roadmaps: RoadmapRecord[];
  onRefresh: () => void;
}) {
  const [title, setTitle] = useState("");
  const [stepsRaw, setStepsRaw] = useState("");
  const [wideMode, setWideMode] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = stepsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!title.trim() || lines.length === 0) return;

    const res = await fetch("/api/roadmaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        category: "Tự tạo",
        items: lines.map((line) => ({ title: line, estimatedMinutes: 60 })),
      }),
    });

    if (res.ok) {
      setTitle("");
      setStepsRaw("");
      onRefresh();
    }
  };

  const handleImportTemplate = async (tpl: (typeof ROADMAP_TEMPLATES)[number]) => {
    const res = await fetch("/api/roadmaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tpl),
    });
    if (res.ok) onRefresh();
  };

  const cycleItemStatus = async (item: RoadmapItemRecord) => {
    playUiTick("check");
    const order: RoadmapItemRecord["status"][] = ["todo", "in_progress", "done"];
    const next = order[(order.indexOf(item.status) + 1) % order.length] ?? "todo";
    await fetch(`/api/roadmaps/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    onRefresh();
  };

  const handleDeleteRoadmap = async (id: string, rmTitle: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa lộ trình "${rmTitle}" không?`)) return;
    await fetch(`/api/roadmaps/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleExportSingle = (rm: RoadmapRecord) => {
    const payload = {
      title: rm.title,
      category: rm.category,
      items: rm.items.map((i) => ({ title: i.title, estimatedMinutes: i.estimatedMinutes })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap-${rm.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (res.ok) onRefresh();
    } catch {
      // ignore invalid json
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Kho 8 Lộ trình mẫu chuẩn (Nạp 1 click vào PostgreSQL)
          </h3>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {ROADMAP_TEMPLATES.map((tpl) => (
            <button
              key={tpl.title}
              type="button"
              onClick={() => handleImportTemplate(tpl)}
              className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 text-left transition hover:border-[var(--accent)]"
            >
              <div>
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  {tpl.category}
                </span>
                <div className="mt-2 text-xs font-semibold text-[var(--text-primary)]">
                  {tpl.title}
                </div>
              </div>
              <span className="mt-3 text-[11px] font-medium text-[var(--accent)]">
                + Nạp {tpl.items.length} chặng
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Tạo lộ trình cá nhân mới
          </h3>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)]">
            <Upload className="h-3.5 w-3.5 text-[var(--accent)]" />
            Nhập lộ trình (.json)
            <input type="file" accept=".json" onChange={handleImportSingle} className="hidden" />
          </label>
        </div>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên lộ trình (VD: Ôn thi Giải tích 2 trong 14 ngày)..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <textarea
            rows={3}
            value={stepsRaw}
            onChange={(e) => setStepsRaw(e.target.value)}
            placeholder="Nhập các chặng học (mỗi dòng 1 chặng)..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="accent-gradient inline-flex w-fit items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo lộ trình
          </button>
        </form>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setWideMode((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {wideMode ? "Thu về 2 cột" : "Chế độ đọc rộng (1 cột)"}
        </button>
      </div>
      <div className={wideMode ? "grid gap-4 grid-cols-1" : "grid gap-4 md:grid-cols-2"}>
        {roadmaps.map((rm) => {
          const doneCount = rm.items.filter((i) => i.status === "done").length;
          const pct = rm.items.length > 0 ? Math.round((doneCount / rm.items.length) * 100) : 0;
          const remainMins = rm.items
            .filter((i) => i.status !== "done")
            .reduce((acc, it) => acc + (it.estimatedMinutes || 45), 0);
          const etaDays = Math.ceil(remainMins / 60);
          return (
            <div key={rm.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {rm.category}
                  </span>
                  <h4 className="mt-0.5 font-semibold text-[var(--text-primary)]">{rm.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold tabular-nums text-[var(--accent)]">
                    {pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExportSingle(rm)}
                    title="Xuất lộ trình này ra file JSON"
                    className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRoadmap(rm.id, rm.title)}
                    title="Xóa lộ trình"
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>
                  {doneCount}/{rm.items.length} chặng hoàn thành
                </span>
                <span>
                  {remainMins > 0 ? `Dự kiến xong sau ~${etaDays} ngày (60p/ngày)` : "Đã hoàn thành 100%!"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="accent-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>

              <ul className="relative mt-4 space-y-1.5 border-l-2 border-[var(--border-subtle)] pl-3 ml-2">
                {rm.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => cycleItemStatus(item)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[var(--bg-elevated)]"
                    >
                      <span className="flex items-center gap-2">
                        {item.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : item.status === "in_progress" ? (
                          <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        )}
                        <span
                          className={
                            item.status === "done"
                              ? "text-[var(--text-muted)] line-through"
                              : "text-[var(--text-primary)]"
                          }
                        >
                          {item.title}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                        {item.estimatedMinutes}p
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
