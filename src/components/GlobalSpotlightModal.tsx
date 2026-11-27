"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";
import type { TodoItem } from "./SubjectTodoPanel";
import type { FlashcardRecord, NoteRecord } from "./NotesFlashcardsPanel";
import type { ExamRecord } from "./DashboardBento";
import type { GradeRecord } from "./ScheduleGpaPanel";
import type { RoadmapRecord } from "./RoadmapPanel";
import type { GoalRecord } from "./GoalsTimeblockPanel";
import type { HabitRecord } from "./HabitsVaultPanel";

interface FormulaItem {
  id: string;
  subjectName: string;
  title: string;
  body: string;
}

type JumpTab =
  | "dashboard"
  | "focus"
  | "schedule"
  | "planner"
  | "goals"
  | "habits"
  | "roadmaps"
  | "knowledge"
  | "expenses"
  | "analytics"
  | "settings";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

const TAB_ENTRIES: { id: JumpTab; title: string; sub: string }[] = [
  { id: "dashboard", title: "Tổng quan (Dashboard)", sub: "Thống kê ngày, lịch thi & mục tiêu" },
  { id: "focus", title: "Tập trung (Pomodoro / Flowtime)", sub: "Đồng hồ đếm giờ & lịch sử phiên học" },
  { id: "schedule", title: "Lịch học & Điểm GPA", sub: "Thời khóa biểu & bảng điểm đại học" },
  { id: "planner", title: "Môn học & Công việc (Todo)", sub: "Danh sách môn & việc cần làm" },
  { id: "goals", title: "Mục tiêu & Khung giờ", sub: "Mục tiêu học kỳ & phân bổ giờ" },
  { id: "habits", title: "Thói quen & Tài nguyên", sub: "Chuỗi thói quen, sách & liên kết" },
  { id: "roadmaps", title: "Lộ trình học tập", sub: "Các chặng ôn luyện & tiến độ" },
  { id: "knowledge", title: "Ghi chú, Flashcards & Lỗi sai", sub: "Kho kiến thức & ôn thẻ ghi nhớ" },
  { id: "expenses", title: "Quản lý Chi tiêu", sub: "Thu chi hàng tháng của sinh viên" },
  { id: "analytics", title: "Phân tích & Báo cáo", sub: "Biểu đồ học tập & xu hướng tuần" },
  { id: "settings", title: "Cài đặt & Giao diện", sub: "Theme, ảnh đại diện & sao lưu" },
];

export function GlobalSpotlightModal({
  open,
  onClose,
  subjects,
  todos,
  notes,
  flashcards,
  exams,
  grades = [],
  roadmaps = [],
  goals = [],
  habits = [],
  onJumpTab,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  todos: TodoItem[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  exams: ExamRecord[];
  grades?: GradeRecord[];
  roadmaps?: RoadmapRecord[];
  goals?: GoalRecord[];
  habits?: HabitRecord[];
  onJumpTab: (tab: JumpTab) => void;
}) {
  const [query, setQuery] = useState("");
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    try {
      const raw = localStorage.getItem("kronoflow-formulas-v1");
      if (raw) setFormulas(JSON.parse(raw) as FormulaItem[]);
    } catch {
      // ignore
    }
  }, [open]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    const items: { id: string; group: string; title: string; sub: string; tab: JumpTab }[] = [];

    for (const tb of TAB_ENTRIES) {
      if (norm(`${tb.title} ${tb.sub}`).includes(q)) {
        items.push({ id: `tab-${tb.id}`, group: "Chuyển tab", title: tb.title, sub: tb.sub, tab: tb.id });
      }
    }
    for (const s of subjects) {
      if (norm(s.name).includes(q)) {
        items.push({ id: `sub-${s.id}`, group: "Môn học", title: s.name, sub: "Tab Môn học & Todo", tab: "planner" });
      }
    }
    for (const g of grades) {
      if (norm(`${g.courseName} ${g.semester}`).includes(q)) {
        items.push({
          id: `gr-${g.id}`,
          group: "Điểm GPA",
          title: g.courseName,
          sub: `${g.semester} · ${g.credits} TC · Điểm ${g.score10}`,
          tab: "schedule",
        });
      }
    }
    for (const ex of exams) {
      if (norm(ex.title).includes(q)) {
        items.push({
          id: `ex-${ex.id}`,
          group: "Kỳ thi",
          title: ex.title,
          sub: `Ngày thi: ${ex.examDate.slice(0, 10)}`,
          tab: "dashboard",
        });
      }
    }
    for (const t of todos) {
      if (norm(t.title).includes(q)) {
        items.push({
          id: `td-${t.id}`,
          group: "Công việc",
          title: t.title,
          sub: t.isCompleted ? "Đã hoàn thành" : `Ưu tiên: ${t.priority}`,
          tab: "planner",
        });
      }
    }
    for (const rm of roadmaps) {
      if (norm(rm.title).includes(q)) {
        items.push({ id: `rm-${rm.id}`, group: "Lộ trình", title: rm.title, sub: "Tab Lộ trình học tập", tab: "roadmaps" });
      }
    }
    for (const gl of goals) {
      if (norm(gl.title).includes(q)) {
        items.push({ id: `gl-${gl.id}`, group: "Mục tiêu", title: gl.title, sub: "Tab Mục tiêu", tab: "goals" });
      }
    }
    for (const hb of habits) {
      if (norm(hb.title).includes(q)) {
        items.push({ id: `hb-${hb.id}`, group: "Thói quen", title: hb.title, sub: "Tab Thói quen", tab: "habits" });
      }
    }
    for (const n of notes) {
      if (norm(n.title).includes(q) || norm(n.content).includes(q)) {
        items.push({
          id: `nt-${n.id}`,
          group: "Ghi chú",
          title: n.title,
          sub: n.content.slice(0, 70),
          tab: "knowledge",
        });
      }
    }
    for (const fc of flashcards) {
      if (norm(fc.front).includes(q) || norm(fc.back).includes(q)) {
        items.push({
          id: `fc-${fc.id}`,
          group: "Flashcard",
          title: fc.front,
          sub: fc.back.slice(0, 70),
          tab: "knowledge",
        });
      }
    }
    for (const fm of formulas) {
      if (norm(fm.title).includes(q) || norm(fm.body).includes(q) || norm(fm.subjectName).includes(q)) {
        items.push({
          id: `fm-${fm.id}`,
          group: "Công thức",
          title: fm.title,
          sub: `${fm.subjectName} — ${fm.body.slice(0, 50)}`,
          tab: "knowledge",
        });
      }
    }
    return items.slice(0, 30);
  }, [query, subjects, todos, notes, flashcards, exams, grades, roadmaps, goals, habits, formulas]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[80] flex items-start justify-center bg-black/55 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--accent)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm xuyên suốt 11 Tab, Điểm GPA, Ghi chú, Flashcards, Lộ trình, Mục tiêu, Thói quen..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Nhập từ khóa tiếng Việt (có dấu hoặc không dấu) để tìm xuyên suốt toàn bộ không gian KronoFlow.
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Không tìm thấy kết quả nào cho &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-1.5">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onJumpTab(r.tab);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-3.5 py-2.5 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        {r.group}
                      </span>
                      <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{r.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{r.sub}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
