"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
  PlayCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionLogItem } from "./PomodoroTimer";

export interface TodoItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  isCompleted: boolean;
  subjectId: string | null;
}

export interface SubjectRecord {
  id: string;
  name: string;
  color: string;
  targetHours: number;
}

const SWATCHES = ["#1d4ed8", "#0f766e", "#b45309", "#be123c", "#6d28d9", "#374151"];

const PRIORITY_BADGE: Record<TodoItem["priority"], string> = {
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  low: "bg-zinc-500/10 text-[var(--text-muted)] border-[var(--border-hairline)]",
};

export function SubjectTodoPanel({
  subjects,
  todos,
  sessions,
  onFocusTask,
  onRefresh,
}: {
  subjects: SubjectRecord[];
  todos: TodoItem[];
  sessions: SessionLogItem[];
  onFocusTask: (taskTitle: string) => void;
  onRefresh: () => void;
}) {
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState(SWATCHES[0] ?? "#1d4ed8");
  const [targetHours, setTargetHours] = useState(20);

  const [todoTitle, setTodoTitle] = useState("");
  const [todoSubjectId, setTodoSubjectId] = useState("");
  const [priority, setPriority] = useState<TodoItem["priority"]>("medium");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: subjectName.trim(),
        color: subjectColor,
        targetHours,
      }),
    });
    if (res.ok) {
      setSubjectName("");
      onRefresh();
    }
  };

  const handleDeleteSubject = async (id: string) => {
    await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTitle.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: todoTitle.trim(),
        subjectId: todoSubjectId || null,
        priority,
      }),
    });
    if (res.ok) {
      setTodoTitle("");
      onRefresh();
    }
  };

  const toggleTodo = async (todo: TodoItem) => {
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !todo.isCompleted }),
    });
    onRefresh();
  };

  const deleteTodo = async (id: string) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === "pending") return !t.isCompleted;
    if (filter === "done") return t.isCompleted;
    return true;
  });

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-sm lg:col-span-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Môn học & Tiến độ
          </h3>
        </div>

        <form onSubmit={handleAddSubject} className="mt-4 space-y-3">
          <input
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Tên môn học (VD: Cấu trúc dữ liệu)..."
            className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSubjectColor(c)}
                  className={cn(
                    "h-5 w-5 rounded-full transition",
                    subjectColor === c && "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={500}
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                className="w-16 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)]"
              />
              <span className="text-xs text-[var(--text-muted)]">giờ</span>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm
              </button>
            </div>
          </div>
        </form>

        <ul className="mt-5 space-y-3">
          {subjects.length === 0 ? (
            <li className="text-xs text-[var(--text-muted)]">Chưa có môn học nào.</li>
          ) : (
            subjects.map((sub) => {
              const loggedMins = sessions
                .filter((s) => s.status === "completed" && s.subjectId === sub.id)
                .reduce((acc, s) => acc + s.actualMinutes, 0);
              const loggedHours = +(loggedMins / 60).toFixed(1);
              const pct = Math.min(100, Math.round((loggedHours / sub.targetHours) * 100));

              return (
                <li
                  key={sub.id}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      {sub.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                        {loggedHours}h / {sub.targetHours}h
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                        title="Xóa môn học"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: sub.color }}
                    />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-sm lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Danh sách công việc
          </h3>
          <div className="flex gap-1 rounded-lg bg-[var(--bg-subtle)] p-1 text-xs">
            {(
              [
                ["all", "Tất cả"],
                ["pending", "Chưa xong"],
                ["done", "Đã xong"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  filter === k
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddTodo} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={todoTitle}
            onChange={(e) => setTodoTitle(e.target.value)}
            placeholder="Thêm đầu việc cụ thể..."
            className="min-w-[200px] flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
          />
          <select
            value={todoSubjectId}
            onChange={(e) => setTodoSubjectId(e.target.value)}
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-secondary)] outline-none"
          >
            <option value="">Không gắn môn</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoItem["priority"])}
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-secondary)] outline-none"
          >
            <option value="high">Ưu tiên cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </button>
        </form>

        <ul className="mt-5 space-y-2">
          {filteredTodos.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--border-hairline)] p-6 text-center text-xs text-[var(--text-muted)]">
              Không có công việc nào trong mục này.
            </li>
          ) : (
            filteredTodos.map((todo) => {
              const sub = todo.subjectId ? subjectMap.get(todo.subjectId) : undefined;
              return (
                <li
                  key={todo.id}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm"
                  >
                    {todo.isCompleted ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    )}
                    <span
                      className={cn(
                        "truncate",
                        todo.isCompleted
                          ? "text-[var(--text-muted)] line-through"
                          : "text-[var(--text-primary)]"
                      )}
                    >
                      {todo.title}
                    </span>
                    {sub && (
                      <span
                        className="hidden rounded-md px-2 py-0.5 text-[10px] font-medium text-white sm:inline-block"
                        style={{ backgroundColor: sub.color }}
                      >
                        {sub.name}
                      </span>
                    )}
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    {!todo.isCompleted && (
                      <button
                        type="button"
                        onClick={() => onFocusTask(todo.title)}
                        title="Đưa vào bộ đếm Pomodoro"
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      >
                        <PlayCircle className="h-3 w-3" />
                        Học ngay
                      </button>
                    )}
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                        PRIORITY_BADGE[todo.priority]
                      )}
                    >
                      {todo.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTodo(todo.id)}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
