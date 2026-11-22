"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
  PlayCircle,
  BookOpen,
  Columns3,
  List,
  Grid2x2,
  Flame,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionLogItem } from "./PomodoroTimer";

export interface TodoItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  status?: "todo" | "in_progress" | "done";
  isUrgent?: boolean;
  isCompleted: boolean;
  dueDate?: string | null;
  subjectId: string | null;
}

export interface SubjectRecord {
  id: string;
  name: string;
  color: string;
  targetHours: number;
}

const SWATCHES = ["#2563eb", "#0f766e", "#b45309", "#be123c", "#6d28d9", "#475569"];

const PRIORITY_BADGE: Record<TodoItem["priority"], string> = {
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  low: "bg-zinc-500/10 text-[var(--text-muted)] border-[var(--border-subtle)]",
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
  const [view, setView] = useState<"list" | "kanban" | "eisenhower">("list");
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState(SWATCHES[0] ?? "#2563eb");
  const [targetHours, setTargetHours] = useState(20);

  const [todoTitle, setTodoTitle] = useState("");
  const [todoSubjectId, setTodoSubjectId] = useState("");
  const [todoDue, setTodoDue] = useState("");
  const [priority, setPriority] = useState<TodoItem["priority"]>("medium");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [todoQuery, setTodoQuery] = useState("");
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState("");

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
        dueDate: todoDue ? new Date(todoDue).toISOString() : null,
      }),
    });
    if (res.ok) {
      setTodoTitle("");
      setTodoDue("");
      onRefresh();
    }
  };

  const setTodoStatus = async (todo: TodoItem, nextStatus: "todo" | "in_progress" | "done") => {
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, isCompleted: nextStatus === "done" }),
    });
    onRefresh();
  };

  const toggleUrgent = async (todo: TodoItem) => {
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isUrgent: !todo.isUrgent }),
    });
    onRefresh();
  };

  const saveTodoEdit = async (id: string) => {
    if (!editTodoTitle.trim()) return;
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTodoTitle.trim() }),
    });
    setEditingTodoId(null);
    onRefresh();
  };

  const deleteTodo = async (id: string) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const normalizedStatus = (t: TodoItem): "todo" | "in_progress" | "done" =>
    t.status ?? (t.isCompleted ? "done" : "todo");

  const filteredTodos = todos.filter((t) => {
    if (todoQuery.trim() && !t.title.toLowerCase().includes(todoQuery.toLowerCase())) return false;
    if (filter === "pending") return !t.isCompleted;
    if (filter === "done") return t.isCompleted;
    return true;
  });

  const activeTodos = todos.filter((t) => !t.isCompleted);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Môn học & Tiến độ</h3>
          </div>

          <form onSubmit={handleAddSubject} className="mt-4 space-y-3">
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Tên môn học..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubjectColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full",
                      subjectColor === c &&
                        "ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="w-14 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)]"
                />
                <span className="text-[11px] text-[var(--text-muted)]">giờ</span>
                <button
                  type="submit"
                  className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm
                </button>
              </div>
            </div>
          </form>

          <ul className="mt-5 space-y-2.5">
            {subjects.map((sub) => {
              const loggedMins = sessions
                .filter((s) => s.status === "completed" && s.subjectId === sub.id)
                .reduce((acc, s) => acc + s.actualMinutes, 0);
              const loggedHours = +(loggedMins / 60).toFixed(1);
              const pct = Math.min(100, Math.round((loggedHours / sub.targetHours) * 100));
              return (
                <li
                  key={sub.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      {sub.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        {loggedHours}h/{sub.targetHours}h
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: sub.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Quản lý công việc ({todos.length})
            </h3>

            <div className="inline-flex rounded-lg bg-[var(--bg-elevated)] p-1 text-xs">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium",
                  view === "list"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)]"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Danh sách
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium",
                  view === "kanban"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)]"
                )}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setView("eisenhower")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium",
                  view === "eisenhower"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)]"
                )}
              >
                <Grid2x2 className="h-3.5 w-3.5" />
                Eisenhower
              </button>
            </div>
          </div>

          <form onSubmit={handleAddTodo} className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              placeholder="Thêm đầu việc mới..."
              className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <input
              type="date"
              value={todoDue}
              onChange={(e) => setTodoDue(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-secondary)]"
            />
            <select
              value={todoSubjectId}
              onChange={(e) => setTodoSubjectId(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-secondary)]"
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
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="high">Quan trọng (Cao)</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm
            </button>
          </form>

          {view === "list" && (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <input
                  type="text"
                  value={todoQuery}
                  onChange={(e) => setTodoQuery(e.target.value)}
                  placeholder="Tìm kiếm nhanh công việc..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)] sm:w-56"
                />
                <div className="flex gap-1.5">
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
                      "rounded-lg px-2.5 py-1 font-medium",
                      filter === k
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    {label}
                  </button>
                ))}
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {filteredTodos.map((todo) => {
                  const sub = todo.subjectId ? subjectMap.get(todo.subjectId) : undefined;
                  return (
                    <li
                      key={todo.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => setTodoStatus(todo, todo.isCompleted ? "todo" : "done")}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-xs"
                      >
                        {todo.isCompleted ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        )}
                        <span
                          className={cn(
                            "truncate font-medium",
                            todo.isCompleted
                              ? "text-[var(--text-muted)] line-through"
                              : "text-[var(--text-primary)]"
                          )}
                        >
                          {todo.title}
                        </span>
                        {sub && (
                          <span
                            className="hidden rounded px-1.5 py-0.5 text-[10px] text-white sm:inline-block"
                            style={{ backgroundColor: sub.color }}
                          >
                            {sub.name}
                          </span>
                        )}
                      </button>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {editingTodoId === todo.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editTodoTitle}
                              onChange={(e) => setEditTodoTitle(e.target.value)}
                              className="w-32 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => saveTodoEdit(todo.id)}
                              className="rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] text-white"
                            >
                              Lưu
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTodoId(todo.id);
                              setEditTodoTitle(todo.title);
                            }}
                            title="Sửa nhanh tên việc"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleUrgent(todo)}
                          title="Đánh dấu Khẩn cấp (Ma trận Eisenhower)"
                          className={cn(
                            "rounded-lg p-1",
                            todo.isUrgent
                              ? "bg-rose-500/15 text-rose-500"
                              : "text-[var(--text-muted)] hover:text-rose-500"
                          )}
                        >
                          <Flame className="h-3.5 w-3.5" />
                        </button>
                        {!todo.isCompleted && (
                          <button
                            type="button"
                            onClick={() => onFocusTask(todo.title)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]"
                          >
                            <PlayCircle className="h-3 w-3" />
                            Học
                          </button>
                        )}
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            PRIORITY_BADGE[todo.priority]
                          )}
                        >
                          {todo.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteTodo(todo.id)}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {view === "kanban" && (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(
                [
                  { id: "todo", label: "Cần làm", next: "in_progress" },
                  { id: "in_progress", label: "Đang làm", next: "done" },
                  { id: "done", label: "Hoàn thành", next: "todo" },
                ] as const
              ).map((col) => {
                const items = todos.filter((t) => normalizedStatus(t) === col.id);
                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverCol(col.id);
                    }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverCol(null);
                      const id = e.dataTransfer.getData("text/plain") || dragTodoId;
                      const found = todos.find((x) => x.id === id);
                      if (found && normalizedStatus(found) !== col.id) {
                        setTodoStatus(found, col.id);
                      }
                      setDragTodoId(null);
                    }}
                    className={cn(
                      "rounded-xl border bg-[var(--bg-canvas)] p-3 transition",
                      dragOverCol === col.id
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                        : "border-[var(--border-subtle)]"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span>{col.label}</span>
                      <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px]">
                        {items.length}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            setDragTodoId(item.id);
                            e.dataTransfer.setData("text/plain", item.id);
                          }}
                          onDragEnd={() => {
                            setDragTodoId(null);
                            setDragOverCol(null);
                          }}
                          className="cursor-grab rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-xs active:cursor-grabbing"
                        >
                          <div className="font-medium text-[var(--text-primary)]">{item.title}</div>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span
                              className={cn(
                                "rounded border px-1.5 py-0.5 text-[10px]",
                                PRIORITY_BADGE[item.priority]
                              )}
                            >
                              {item.priority}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTodoStatus(item, col.next)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-medium text-[var(--accent)]"
                            >
                              Chuyển
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "eisenhower" && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Q1 · Làm ngay (Quan trọng + Khẩn cấp)",
                  tone: "border-rose-500/30 bg-rose-500/5",
                  items: activeTodos.filter((t) => t.priority === "high" && t.isUrgent),
                },
                {
                  title: "Q2 · Lên lịch (Quan trọng + Chưa khẩn)",
                  tone: "border-blue-500/30 bg-blue-500/5",
                  items: activeTodos.filter((t) => t.priority === "high" && !t.isUrgent),
                },
                {
                  title: "Q3 · Làm nhanh (Khẩn cấp + Ưu tiên vừa/thấp)",
                  tone: "border-amber-500/30 bg-amber-500/5",
                  items: activeTodos.filter((t) => t.priority !== "high" && t.isUrgent),
                },
                {
                  title: "Q4 · Để sau (Không khẩn + Ưu tiên vừa/thấp)",
                  tone: "border-[var(--border-subtle)] bg-[var(--bg-canvas)]",
                  items: activeTodos.filter((t) => t.priority !== "high" && !t.isUrgent),
                },
              ].map((q) => (
                <div key={q.title} className={cn("rounded-xl border p-3.5", q.tone)}>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {q.title} ({q.items.length})
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {q.items.length === 0 ? (
                      <li className="text-[11px] text-[var(--text-muted)]">Trống</li>
                    ) : (
                      q.items.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs"
                        >
                          <span className="truncate text-[var(--text-primary)]">{t.title}</span>
                          <button
                            type="button"
                            onClick={() => onFocusTask(t.title)}
                            className="shrink-0 text-[11px] font-medium text-[var(--accent)]"
                          >
                            Học
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
