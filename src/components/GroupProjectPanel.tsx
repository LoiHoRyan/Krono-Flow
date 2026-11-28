"use client";

import { getLocalDateIso } from "@/lib/utils";

import { useEffect, useState } from "react";
import { Users, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { playUiTick } from "@/lib/ui-sounds";

interface GroupTask {
  id: string;
  project: string;
  member: string;
  task: string;
  deadline: string;
  done: boolean;
}

export function GroupProjectPanel() {
  const [items, setItems] = useState<GroupTask[]>([]);
  const [project, setProject] = useState("");
  const [member, setMember] = useState("");
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-group-projects");
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (next: GroupTask[]) => {
    setItems(next);
    localStorage.setItem("kronoflow-group-projects", JSON.stringify(next));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim() || !task.trim()) return;
    persist([
      {
        id: String(Date.now()),
        project: project.trim(),
        member: member.trim() || "Cả nhóm",
        task: task.trim(),
        deadline: deadline || getLocalDateIso(),
        done: false,
      },
      ...items,
    ]);
    setTask("");
  };

  const toggleItem = (id: string) => {
    playUiTick("check");
    persist(items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  const doneCount = items.filter((x) => x.done).length;
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <section className="glass-card card-lift rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-base font-medium text-[var(--text-primary)]">
            Theo dõi Đồ án & Bài tập Nhóm
          </h3>
        </div>
        {items.length > 0 && (
          <span className="font-mono text-xs text-[var(--accent)]">
            {doneCount}/{items.length} phần xong ({pct}%)
          </span>
        )}
      </div>

      <form onSubmit={addTask} className="mt-4 grid gap-2 sm:grid-cols-12">
        <input
          type="text"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="Tên đồ án (VD: Nhóm 1 DSA)"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] sm:col-span-3"
        />
        <input
          type="text"
          value={member}
          onChange={(e) => setMember(e.target.value)}
          placeholder="Phụ trách (VD: Minh, Lan)"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] sm:col-span-2"
        />
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Đầu việc được phân công..."
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] sm:col-span-4"
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-2 text-xs text-[var(--text-primary)] sm:col-span-2"
        />
        <button
          type="submit"
          className="btn-primary inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium sm:col-span-1"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs"
            >
              <button
                type="button"
                onClick={() => toggleItem(it.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                {it.done ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                )}
                <div className="min-w-0">
                  <div className={it.done ? "line-through text-[var(--text-muted)]" : "font-medium text-[var(--text-primary)]"}>
                    {it.task}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
                    <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 font-medium text-[var(--accent)]">
                      {it.project}
                    </span>
                    <span>Phụ trách: {it.member}</span>
                    <span className="font-mono">Hạn: {it.deadline}</span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => persist(items.filter((x) => x.id !== it.id))}
                className="text-[var(--text-muted)] hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
