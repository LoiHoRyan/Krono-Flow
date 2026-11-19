"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Timer,
  CalendarDays,
  CheckSquare,
  Map as MapIcon,
  BarChart3,
  BookMarked,
  Sliders,
  Database,
  Command,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { THEMES, WALLPAPERS } from "@/lib/themes";
import { AuthScreen } from "@/components/AuthScreen";
import { DashboardBento, ExamRecord, UserProfile } from "@/components/DashboardBento";
import { PomodoroTimer, SessionLogItem } from "@/components/PomodoroTimer";
import { SubjectTodoPanel, SubjectRecord, TodoItem } from "@/components/SubjectTodoPanel";
import { RoadmapPanel, RoadmapRecord } from "@/components/RoadmapPanel";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import {
  NotesFlashcardsPanel,
  NoteRecord,
  FlashcardRecord,
} from "@/components/NotesFlashcardsPanel";
import {
  ScheduleGpaPanel,
  ScheduleSlotRecord,
  GradeRecord,
} from "@/components/ScheduleGpaPanel";
import { StudioSettingsPanel } from "@/components/StudioSettingsPanel";

type TabId =
  | "dashboard"
  | "focus"
  | "schedule"
  | "planner"
  | "roadmaps"
  | "knowledge"
  | "analytics"
  | "settings";

const NAV_ITEMS: { id: TabId; label: string; desc: string; icon: typeof Timer }[] = [
  { id: "dashboard", label: "Tổng quan", desc: "Lịch tháng, KPI & Kỳ thi", icon: LayoutDashboard },
  { id: "focus", label: "Phòng Tập Trung", desc: "Pomodoro & Âm thanh nền", icon: Timer },
  { id: "schedule", label: "Lịch & Sổ điểm", desc: "Thời khóa biểu & Tính GPA", icon: CalendarDays },
  { id: "planner", label: "Môn học & Việc", desc: "Quản lý mục tiêu & task", icon: CheckSquare },
  { id: "roadmaps", label: "Kho Lộ Trình", desc: "8 lộ trình mẫu & tự tạo", icon: MapIcon },
  { id: "knowledge", label: "Ghi chú & Thẻ", desc: "Study Notes & Flashcards", icon: BookMarked },
  { id: "analytics", label: "Thống kê", desc: "Heatmap & Biểu đồ tuần", icon: BarChart3 },
  { id: "settings", label: "Giao diện & Hồ sơ", desc: "6 Theme dịu mắt & Sao lưu", icon: Sliders },
];

export default function HomePage() {
  const [authState, setAuthState] = useState<"loading" | "guest" | "authed">("loading");
  const [tab, setTab] = useState<TabId>("dashboard");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [themeId, setThemeId] = useState("ivory");
  const [wallpaper, setWallpaper] = useState("none");
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapRecord[]>([]);
  const [sessions, setSessions] = useState<SessionLogItem[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [slots, setSlots] = useState<ScheduleSlotRecord[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [focusedTaskTitle, setFocusedTaskTitle] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  const applyThemeTokens = useCallback((tId: string) => {
    const t = THEMES.find((x) => x.id === tId) ?? THEMES[0]!;
    document.documentElement.classList.toggle("dark", t.mode === "dark");
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--accent-soft", `${t.accent}18`);
  }, []);

  useEffect(() => {
    applyThemeTokens(themeId);
  }, [themeId, applyThemeTokens]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [hRes, uRes] = await Promise.all([fetch("/api/health"), fetch("/api/user")]);
      setDbStatus(hRes.ok ? "connected" : "disconnected");

      if (uRes.status === 401) {
        setAuthState("guest");
        return;
      }

      if (uRes.ok) {
        const u: UserProfile = (await uRes.json()).data;
        setUser(u);
        if (u?.theme) setThemeId(u.theme);
        if (u?.wallpaper) setWallpaper(u.wallpaper);
        setAuthState("authed");
      }

      const [sRes, tRes, rRes, seRes, nRes, cRes, eRes, scRes, gRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/todos"),
        fetch("/api/roadmaps"),
        fetch("/api/sessions"),
        fetch("/api/notes"),
        fetch("/api/flashcards"),
        fetch("/api/exams"),
        fetch("/api/schedule"),
        fetch("/api/grades"),
      ]);

      if (sRes.ok) setSubjects((await sRes.json()).data ?? []);
      if (tRes.ok) setTodos((await tRes.json()).data ?? []);
      if (rRes.ok) setRoadmaps((await rRes.json()).data ?? []);
      if (seRes.ok) setSessions((await seRes.json()).data ?? []);
      if (nRes.ok) setNotes((await nRes.json()).data ?? []);
      if (cRes.ok) setFlashcards((await cRes.json()).data ?? []);
      if (eRes.ok) setExams((await eRes.json()).data ?? []);
      if (scRes.ok) setSlots((await scRes.json()).data ?? []);
      if (gRes.ok) setGrades((await gRes.json()).data ?? []);
    } catch {
      setDbStatus("disconnected");
      setAuthState("guest");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAuthState("guest");
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      subjects,
      todos,
      roadmaps,
      sessions,
      notes,
      flashcards,
      exams,
      slots,
      grades,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] text-sm text-[var(--text-muted)]">
        Đang tải không gian KronoFlow...
      </div>
    );
  }

  if (authState === "guest") {
    return <AuthScreen onSuccess={loadAll} />;
  }

  const wpPreset = WALLPAPERS.find((w) => w.id === wallpaper);
  const bgStyle: React.CSSProperties = wallpaper.startsWith("http")
    ? {
        backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.65)), url(${wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : wallpaper === "dots"
    ? { backgroundImage: wpPreset?.style, backgroundSize: "20px 20px" }
    : { backgroundImage: wpPreset?.style ?? "none" };

  const currentNav = NAV_ITEMS.find((n) => n.id === tab) ?? NAV_ITEMS[0]!;

  return (
    <div className="min-h-screen lg:flex" style={bgStyle}>
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:flex">
        <div>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
                KF
              </span>
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">KronoFlow</h1>
                <p className="text-[11px] text-[var(--text-muted)]">Study Workspace</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ⌘K
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition",
                    tab === item.id
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center justify-between px-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Database
                className={cn(
                  "h-3.5 w-3.5",
                  dbStatus === "connected" ? "text-emerald-500" : "text-rose-500"
                )}
              />
              {dbStatus === "connected" ? "PostgreSQL" : "Offline"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-rose-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 pb-24 lg:pb-10">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-8">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {currentNav.label}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">{currentNav.desc}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]"
            >
              <Command className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chuyển nhanh</span>
              <kbd className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl+K
              </kbd>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:text-rose-500 lg:hidden"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
          {tab === "dashboard" && (
            <DashboardBento
              user={user}
              subjects={subjects}
              sessions={sessions}
              todos={todos}
              roadmaps={roadmaps}
              flashcards={flashcards}
              exams={exams}
              onJumpFocus={(title) => {
                if (title) setFocusedTaskTitle(title);
                setTab("focus");
              }}
              onRefresh={loadAll}
            />
          )}
          {tab === "focus" && (
            <PomodoroTimer
              subjects={subjects}
              sessions={sessions}
              focusedTaskTitle={focusedTaskTitle}
              onClearFocusedTask={() => setFocusedTaskTitle(null)}
              onSessionCompleted={loadAll}
            />
          )}
          {tab === "schedule" && (
            <ScheduleGpaPanel slots={slots} grades={grades} onRefresh={loadAll} />
          )}
          {tab === "planner" && (
            <SubjectTodoPanel
              subjects={subjects}
              todos={todos}
              sessions={sessions}
              onFocusTask={(title) => {
                setFocusedTaskTitle(title);
                setTab("focus");
              }}
              onRefresh={loadAll}
            />
          )}
          {tab === "roadmaps" && <RoadmapPanel roadmaps={roadmaps} onRefresh={loadAll} />}
          {tab === "knowledge" && (
            <NotesFlashcardsPanel
              subjects={subjects}
              notes={notes}
              flashcards={flashcards}
              onRefresh={loadAll}
            />
          )}
          {tab === "analytics" && <AnalyticsPanel sessions={sessions} subjects={subjects} />}
          {tab === "settings" && (
            <StudioSettingsPanel
              user={user}
              onApplyLocalTheme={(t, w) => {
                setThemeId(t);
                setWallpaper(w);
              }}
              onExportBackup={handleExportBackup}
              onRefresh={loadAll}
            />
          )}
        </main>
      </div>

      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24 backdrop-blur-sm"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Điều hướng nhanh
              </span>
              <button type="button" onClick={() => setCmdOpen(false)}>
                <X className="h-4 w-4 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setCmdOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-[var(--accent)]" />
                      {item.label}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-w-[68px] flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                tab === item.id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
