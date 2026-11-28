"use client";

import { kfConfirm, kfPrompt } from "@/lib/notify";

import { useState, useEffect } from "react";
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
  GripVertical,
  Sparkles,
  CalendarPlus,
  ListChecks,
  Copy,
  Link2,
  Download,
} from "lucide-react";
import { cn, normalizeVi, getLocalDateIso } from "@/lib/utils";
import type { SessionLogItem } from "./PomodoroTimer";
import type { NoteRecord, FlashcardRecord } from "./NotesFlashcardsPanel";
import type { ExamRecord } from "./DashboardBento";
import { SubjectHubDrawer } from "./SubjectHubDrawer";
import { playUiTick } from "@/lib/ui-sounds";

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
  notes = [],
  flashcards = [],
  exams = [],
  onFocusTask,
  onUndoableDelete,
  onRefresh,
}: {
  subjects: SubjectRecord[];
  todos: TodoItem[];
  sessions: SessionLogItem[];
  notes?: NoteRecord[];
  flashcards?: FlashcardRecord[];
  exams?: ExamRecord[];
  onFocusTask: (taskTitle: string) => void;
  onUndoableDelete?: (label: string, onUndo: () => Promise<void>) => void;
  onRefresh: () => void;
}) {
  const [hubSubject, setHubSubject] = useState<SubjectRecord | null>(null);
  const [subRingView, setSubRingView] = useState(false);
  const [breakingId, setBreakingId] = useState<string | null>(null);
  const [ebbTopic, setEbbTopic] = useState("");
  const [ebbBusy, setEbbBusy] = useState(false);
  const [subtasksMap, setSubtasksMap] = useState<Record<string, { id: string; text: string; done: boolean }[]>>({});
  const [openSubTodoId, setOpenSubTodoId] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState("");
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [todoLinks, setTodoLinks] = useState<Record<string, string>>({});
  const [groupBySub, setGroupBySub] = useState(false);

  useEffect(() => {
    try {
      const rawL = localStorage.getItem("kronoflow-todo-links");
      if (rawL) setTodoLinks(JSON.parse(rawL));
    } catch {
      // ignore
    }
  }, []);

  const attachTodoLink = async (todoId: string) => {
    const cur = todoLinks[todoId] ?? "";
    const url = await kfPrompt("Dán liên kết tài liệu / đề bài cho công việc này (để trống để xóa):", cur);
    if (url === null) return;
    const next = { ...todoLinks };
    if (url.trim()) next[todoId] = url.trim();
    else delete next[todoId];
    setTodoLinks(next);
    localStorage.setItem("kronoflow-todo-links", JSON.stringify(next));
  };

  const duplicateTodo = async (todo: TodoItem) => {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${todo.title} (bản sao)`,
        priority: todo.priority,
        subjectId: todo.subjectId ?? undefined,
        dueDate: todo.dueDate ?? undefined,
      }),
    });
    playUiTick("flip");
    onRefresh();
  };

  const toggleSelectTodo = (id: string) => {
    setSelectedTodoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runBulkTodos = async (action: "done" | "tomorrow" | "delete") => {
    if (selectedTodoIds.length === 0) return;
    setBulkBusy(true);
    try {
      const tomorrowIso = getLocalDateIso(new Date(Date.now() + 86400000));
      await Promise.all(
        selectedTodoIds.map((id) => {
          if (action === "delete") return fetch(`/api/todos/${id}`, { method: "DELETE" });
          if (action === "done")
            return fetch(`/api/todos/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "done", isCompleted: true }),
            });
          return fetch(`/api/todos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dueDate: tomorrowIso }),
          });
        })
      );
      setSelectedTodoIds([]);
      playUiTick("check");
      onRefresh();
    } finally {
      setBulkBusy(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-todo-subtasks");
      if (raw) setSubtasksMap(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const saveSubtasks = (next: Record<string, { id: string; text: string; done: boolean }[]>) => {
    setSubtasksMap(next);
    localStorage.setItem("kronoflow-todo-subtasks", JSON.stringify(next));
  };

  const addSubtask = (todoId: string) => {
    if (!newSubText.trim()) return;
    const cur = subtasksMap[todoId] ?? [];
    saveSubtasks({
      ...subtasksMap,
      [todoId]: [...cur, { id: String(Date.now()), text: newSubText.trim(), done: false }],
    });
    setNewSubText("");
    playUiTick("flip");
  };

  const toggleSubtask = (todoId: string, subId: string) => {
    const cur = subtasksMap[todoId] ?? [];
    saveSubtasks({
      ...subtasksMap,
      [todoId]: cur.map((x) => (x.id === subId ? { ...x, done: !x.done } : x)),
    });
    playUiTick("check");
  };

  const handleCreateEbbinghaus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ebbTopic.trim()) return;
    setEbbBusy(true);
    try {
      const offsets = [1, 3, 7, 14];
      const baseMs = Date.now();
      await Promise.all(
        offsets.map((d, idx) => {
          const due = getLocalDateIso(new Date(baseMs + d * 86400000));
          return fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `[Ôn Ebbinghaus #${idx + 1} · +${d} ngày] ${ebbTopic.trim()}`,
              priority: d <= 3 ? "high" : "medium",
              dueDate: due,
            }),
          });
        })
      );
      setEbbTopic("");
      playUiTick("check");
      onRefresh();
    } finally {
      setEbbBusy(false);
    }
  };

  const handleAiBreakdown = async (todo: TodoItem) => {
    setBreakingId(todo.id);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const k = localStorage.getItem("kronoflow-gemini-key");
      if (k) headers["x-gemini-key"] = k;
      const res = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers,
        body: JSON.stringify({ title: todo.title }),
      });
      if (res.ok) {
        const json = await res.json();
        const subs: string[] = json.data?.subtasks ?? [];
        await Promise.all(
          subs.map((st) =>
            fetch("/api/todos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: st,
                priority: todo.priority,
                subjectId: todo.subjectId ?? undefined,
                dueDate: todo.dueDate ?? undefined,
              }),
            })
          )
        );
        playUiTick("check");
        onRefresh();
      }
    } finally {
      setBreakingId(null);
    }
  };
  const [view, setView] = useState<"list" | "kanban" | "eisenhower">("list");
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState(SWATCHES[0] ?? "#2563eb");
  const [targetHours, setTargetHours] = useState(20);

  const [todoTitle, setTodoTitle] = useState("");
  const [todoSubjectId, setTodoSubjectId] = useState("");
  const [todoDue, setTodoDue] = useState("");
  const [priority, setPriority] = useState<TodoItem["priority"]>("medium");
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "today" | "week" | "high" | "overdue">("all");
  const [sortBy, setSortBy] = useState<"default" | "due" | "priority" | "subject">("default");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [prioFilter, setPrioFilter] = useState<"all" | TodoItem["priority"]>("all");

  useEffect(() => {
    localStorage.setItem("kronoflow-todo-view", view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem("kronoflow-todo-filter", filter);
  }, [filter]);
  const [todoOrder, setTodoOrder] = useState<string[]>([]);
  const [dragListId, setDragListId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-todo-order");
      if (raw) setTodoOrder(JSON.parse(raw));
      const sv = localStorage.getItem("kronoflow-todo-view");
      if (sv === "list" || sv === "kanban" || sv === "eisenhower") setView(sv);
      const lastSub = localStorage.getItem("kronoflow-last-subject");
      if (lastSub) setTodoSubjectId(lastSub);
      const sf = localStorage.getItem("kronoflow-todo-filter");
      if (sf === "all" || sf === "pending" || sf === "done" || sf === "today" || sf === "week" || sf === "high" || sf === "overdue") {
        setFilter(sf);
      }
    } catch {
      // ignore
    }
  }, []);

  const reorderListTodos = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const base = todos.map((t) => t.id);
    const merged = [...todoOrder.filter((id) => base.includes(id)), ...base.filter((id) => !todoOrder.includes(id))];
    const fromIdx = merged.indexOf(sourceId);
    const toIdx = merged.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    merged.splice(fromIdx, 1);
    merged.splice(toIdx, 0, sourceId);
    setTodoOrder(merged);
    localStorage.setItem("kronoflow-todo-order", JSON.stringify(merged));
    playUiTick("flip");
  };
  const [todoQuery, setTodoQuery] = useState("");
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState("");

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    const dupSub = subjects.find((s) => normalizeVi(s.name) === normalizeVi(subjectName.trim()));
    if (dupSub && !(await kfConfirm(`Môn "${dupSub.name}" đã tồn tại. Bạn vẫn muốn tạo thêm?`))) return;
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
    const sub = subjects.find((s) => s.id === id);
    const relTodos = todos.filter((t) => t.subjectId === id).length;
    const relSess = sessions.filter((s) => s.subjectId === id).length;
    const msg = `Xóa môn "${sub?.name ?? ""}"? Hiện có ${relTodos} công việc và ${relSess} phiên học gắn với môn này.`;
    if (!(await kfConfirm(msg))) return;
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
    if (nextStatus === "done") playUiTick("check");
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

  const overdueTodos = todos.filter(
    (t) => !t.isCompleted && t.dueDate && new Date(t.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );

  const rolloverOverdue = async () => {
    const todayIso = new Date().toISOString();
    for (const t of overdueTodos) {
      await fetch(`/api/todos/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: todayIso }),
      });
    }
    onRefresh();
  };

  const deleteTodo = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    onRefresh();
    if (target && onUndoableDelete) {
      onUndoableDelete(`Đã xóa việc "${target.title}"`, async () => {
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: target.title,
            priority: target.priority,
            subjectId: target.subjectId ?? undefined,
            dueDate: target.dueDate ?? undefined,
          }),
        });
        onRefresh();
      });
    }
  };

  const normalizedStatus = (t: TodoItem): "todo" | "in_progress" | "done" =>
    t.status ?? (t.isCompleted ? "done" : "todo");

  const nowIso = getLocalDateIso();
  const weekIso = getLocalDateIso(new Date(Date.now() + 7 * 86400000));
  const prioWeight: Record<TodoItem["priority"], number> = { high: 0, medium: 1, low: 2 };
  const filteredTodos = todos
    .filter((t) => {
      if (todoQuery.trim() && !normalizeVi(t.title).includes(normalizeVi(todoQuery))) return false;
      if (hideCompleted && t.isCompleted) return false;
      if (prioFilter !== "all" && t.priority !== prioFilter) return false;
      if (filter === "pending") return !t.isCompleted;
      if (filter === "done") return t.isCompleted;
      if (filter === "today") return !t.isCompleted && t.dueDate?.slice(0, 10) === nowIso;
      if (filter === "week")
        return !t.isCompleted && Boolean(t.dueDate && t.dueDate.slice(0, 10) >= nowIso && t.dueDate.slice(0, 10) <= weekIso);
      if (filter === "high") return !t.isCompleted && t.priority === "high";
      if (filter === "overdue") return !t.isCompleted && Boolean(t.dueDate && t.dueDate.slice(0, 10) < nowIso);
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return prioWeight[a.priority] - prioWeight[b.priority];
      if (sortBy === "due") return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      if (groupBySub || sortBy === "subject") return (a.subjectId ?? "zzz").localeCompare(b.subjectId ?? "zzz");
      const ia = todoOrder.indexOf(a.id);
      const ib = todoOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });

  const activeTodos = todos.filter((t) => !t.isCompleted);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <SubjectHubDrawer
        subject={hubSubject}
        sessions={sessions}
        todos={todos}
        notes={notes}
        flashcards={flashcards}
        exams={exams}
        onClose={() => setHubSubject(null)}
        onFocusSubject={(title) => onFocusTask?.(title)}
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Môn học & Tiến độ</h3>
            </div>
            <button
              type="button"
              onClick={() => setSubRingView((v) => !v)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {subRingView ? "Thanh ngang" : "Vòng tròn KPI"}
            </button>
          </div>

          <form onSubmit={handleAddSubject} className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {["📐", "💻", "🌍", "📊", "📖", "⚡"].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSubjectName((prev) => (prev.startsWith(em) ? prev : `${em} ${prev}`.trim()))}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 hover:border-[var(--accent)]"
                >
                  {em}
                </button>
              ))}
            </div>
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
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span>Ước tính theo tín chỉ (1 TC ≈ 30h):</span>
              {([2, 3, 4] as const).map((tc) => (
                <button
                  key={tc}
                  type="button"
                  onClick={() => setTargetHours(tc * 30)}
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {tc} TC → {tc * 30}h
                </button>
              ))}
            </div>
          </form>

          <ul className="mt-5 space-y-2.5">
            {subjects.map((sub) => {
              const loggedMins = sessions
                .filter((s) => s.status === "completed" && s.subjectId === sub.id)
                .reduce((acc, s) => acc + s.actualMinutes, 0);
              const loggedHours = +(loggedMins / 60).toFixed(1);
              const pct = Math.min(100, Math.round((loggedHours / sub.targetHours) * 100));
              const lastSubSess = sessions.find((s) => s.status === "completed" && s.subjectId === sub.id);
              const neglected =
                !lastSubSess ||
                Date.now() - new Date(lastSubSess.startedAt).getTime() > 7 * 86400000;
              return (
                <li
                  key={sub.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setHubSubject(sub)}
                      title="Mở bảng chi tiết môn học (Subject Hub)"
                      className="flex items-center gap-2 text-left font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="underline-offset-2 hover:underline">{sub.name}</span>
                      {neglected && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                          &gt;7 ngày chưa ôn
                        </span>
                      )}
                    </button>
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
                  {subRingView ? (
                    <div className="mt-2.5 flex items-center gap-3">
                      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90 shrink-0">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bg-elevated)" strokeWidth="3.5" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke={sub.color}
                          strokeWidth="3.5"
                          strokeDasharray={`${Math.round((pct / 100) * 94.2)} 94.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {pct}% mục tiêu
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: sub.color }}
                      />
                    </div>
                  )}
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
              onChange={(e) => { setTodoSubjectId(e.target.value); if (e.target.value) localStorage.setItem("kronoflow-last-subject", e.target.value); }}
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
              {overdueTodos.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs">
                  <span className="text-amber-700 dark:text-amber-400">
                    Có <strong>{overdueTodos.length}</strong> công việc đã quá hạn chót.
                  </span>
                  <button
                    type="button"
                    onClick={rolloverOverdue}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white"
                  >
                    Dời hết về hôm nay
                  </button>
                </div>
              )}
              {activeTodos.filter((t) => t.priority === "high").length > 5 && (
                <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  ⚠ Bạn đang có <strong>{activeTodos.filter((t) => t.priority === "high").length}</strong> việc ưu tiên Cao cùng lúc — hãy chọn ra 3 việc quan trọng nhất để làm trước nhé.
                </div>
              )}
              {activeTodos.length > 0 && (() => {
                const hi = activeTodos.filter((t) => t.priority === "high").length;
                const md = activeTodos.filter((t) => t.priority === "medium").length;
                const lo = activeTodos.filter((t) => t.priority === "low").length;
                const tot = Math.max(1, activeTodos.length);
                return (
                  <div className="mt-3 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                      <span>Phân bổ ưu tiên việc chưa xong ({activeTodos.length}):</span>
                      <span className="flex gap-2.5">
                        <span className="text-rose-500">Cao: {hi}</span>
                        <span className="text-amber-600">Vừa: {md}</span>
                        <span>Thấp: {lo}</span>
                      </span>
                    </div>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div className="bg-rose-500" style={{ width: `${(hi / tot) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(md / tot) * 100}%` }} />
                      <div className="bg-zinc-400" style={{ width: `${(lo / tot) * 100}%` }} />
                    </div>
                  </div>
                );
              })()}
              <form
                onSubmit={handleCreateEbbinghaus}
                className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
              >
                <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                <input
                  type="text"
                  value={ebbTopic}
                  onChange={(e) => setEbbTopic(e.target.value)}
                  placeholder="Tạo 4 mốc ôn Ebbinghaus (+1, +3, +7, +14 ngày) cho bài vừa học..."
                  className="min-w-[200px] flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none"
                />
                <button
                  type="submit"
                  disabled={ebbBusy || !ebbTopic.trim()}
                  className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] disabled:opacity-50"
                >
                  {ebbBusy ? "Đang tạo..." : "Tạo 4 mốc ôn"}
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <input
                  type="text"
                  value={todoQuery}
                  onChange={(e) => setTodoQuery(e.target.value)}
                  placeholder="Tìm kiếm nhanh công việc..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)] sm:w-56"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", "Tất cả"],
                    ["today", "Hôm nay"],
                    ["week", "7 ngày"],
                    ["high", "Ưu tiên cao"],
                    ["overdue", "Quá hạn"],
                    ["pending", "Chưa xong"],
                    ["done", "Đã xong"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={cn(
                      "rounded-lg px-2 py-1 font-medium",
                      filter === k
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    {label}
                  </button>
                ))}
                {todos.some((t) => t.isCompleted) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const doneList = todos.filter((t) => t.isCompleted);
                      if (!(await kfConfirm(`Dọn sạch ${doneList.length} công việc đã hoàn thành?`))) return;
                      await Promise.all(doneList.map((d) => fetch(`/api/todos/${d.id}`, { method: "DELETE" })));
                      onRefresh();
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                  >
                    Dọn việc đã xong
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setGroupBySub((v) => !v)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] font-medium",
                    groupBySub
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                  )}
                >
                  {groupBySub ? "Đang gom theo môn" : "Gom theo môn"}
                </button>
                <button
                  type="button"
                  onClick={() => setHideCompleted((v) => !v)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] font-medium",
                    hideCompleted
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                  )}
                >
                  {hideCompleted ? "Đang ẩn việc xong" : "Ẩn việc xong"}
                </button>
                <div className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5 text-[10px]">
                  {(
                    [
                      ["all", "Mọi mức"],
                      ["high", "Cao"],
                      ["medium", "TB"],
                      ["low", "Thấp"],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPrioFilter(val)}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium",
                        prioFilter === val
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {todos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const header = "Cong viec,Mon hoc,Uu tien,Han chot,Trang thai\n";
                      const rows = todos
                        .map((t) => {
                          const sName = t.subjectId ? (subjectMap.get(t.subjectId)?.name ?? "") : "";
                          return `"${t.title.replaceAll('"', '""')}","${sName.replaceAll('"', '""')}","${t.priority}","${t.dueDate?.slice(0, 10) ?? ""}","${t.isCompleted ? "Xong" : "Chua xong"}"`;
                        })
                        .join("\n");
                      const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `kronoflow-todos-${getLocalDateIso()}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]"
                  >
                    <Download className="h-3 w-3" /> CSV
                  </button>
                )}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "default" | "due" | "priority" | "subject")}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-secondary)]"
                >
                  <option value="default">Sắp xếp: Mặc định</option>
                  <option value="due">Hạn chót gần nhất</option>
                  <option value="priority">Ưu tiên cao trước</option>
                  <option value="subject">Theo môn học</option>
                </select>
                </div>
              </div>

              {selectedTodoIds.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-xs">
                  <span className="font-semibold text-[var(--accent)]">
                    Đang chọn {selectedTodoIds.length} việc
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => runBulkTodos("done")}
                      className="btn-primary rounded-lg px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
                    >
                      Xong hết
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => runBulkTodos("tomorrow")}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]"
                    >
                      Dời ngày mai
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => runBulkTodos("delete")}
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white"
                    >
                      Xóa đã chọn
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTodoIds([])}
                      className="px-2 py-1 text-[11px] text-[var(--text-muted)]"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}
              <ul className="zebra-list mt-3 space-y-2">
                {filteredTodos.map((todo) => {
                  const sub = todo.subjectId ? subjectMap.get(todo.subjectId) : undefined;
                  return (
                    <li
                      key={todo.id}
                      draggable={sortBy === "default"}
                      onDragStart={() => setDragListId(todo.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragListId) reorderListTodos(dragListId, todo.id);
                        setDragListId(null);
                      }}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                    >
                      {sortBy === "default" && (
                        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--text-muted)] opacity-60" />
                      )}
                      <input
                        type="checkbox"
                        checked={selectedTodoIds.includes(todo.id)}
                        onChange={() => toggleSelectTodo(todo.id)}
                        title="Chọn nhiều việc"
                        className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                      />
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
                        <>
<button
                            type="button"
                            disabled={breakingId === todo.id}
                            onClick={() => handleAiBreakdown(todo)}
                            title="AI tự chia nhỏ việc này thành 4 bước"
                            className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)] disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3" />
                            {breakingId === todo.id ? "..." : "Chia nhỏ"}
                          </button>
<button
                            type="button"
                            onClick={() => onFocusTask(todo.title)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]"
                          >
                            <PlayCircle className="h-3 w-3" />
                            Học
                          </button>
</>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenSubTodoId((cur) => (cur === todo.id ? null : todo.id))}
                          title="Việc con (Subtasks)"
                          className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
                        >
                          <ListChecks className="h-3 w-3" />
                          {(subtasksMap[todo.id] ?? []).length > 0 && (
                            <span>
                              {(subtasksMap[todo.id] ?? []).filter((x) => x.done).length}/
                              {(subtasksMap[todo.id] ?? []).length}
                            </span>
                          )}
                        </button>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            PRIORITY_BADGE[todo.priority]
                          )}
                        >
                          {todo.priority}
                        </span>
                        {todoLinks[todo.id] ? (
                          <a
                            href={todoLinks[todo.id]}
                            target="_blank"
                            rel="noreferrer"
                            title="Mở tài liệu đính kèm"
                            className="text-[var(--accent)] hover:opacity-80"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => attachTodoLink(todo.id)}
                            title="Đính kèm link tài liệu / đề bài"
                            className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => duplicateTodo(todo)}
                          title="Nhân bản công việc này"
                          className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
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
              {openSubTodoId && (
                <div className="mt-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-canvas)] p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Việc con của: {todos.find((x) => x.id === openSubTodoId)?.title ?? ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenSubTodoId(null)}
                      className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newSubText}
                      onChange={(e) => setNewSubText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSubtask(openSubTodoId);
                        }
                      }}
                      placeholder="Thêm bước nhỏ..."
                      className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => addSubtask(openSubTodoId)}
                      className="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-medium"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {(subtasksMap[openSubTodoId] ?? []).map((st) => (
                      <label key={st.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                        <input
                          type="checkbox"
                          checked={st.done}
                          onChange={() => toggleSubtask(openSubTodoId, st.id)}
                        />
                        <span className={st.done ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                          {st.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
