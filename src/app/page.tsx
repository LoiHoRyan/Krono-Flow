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
  Sparkles,
  Target,
  Sliders,
  Database,
  Command,
  LogOut,
  Play,
  Pause,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { applyThemeToDocument, WALLPAPERS } from "@/lib/themes";
import { LanguageProvider, LanguageToggle, useLang } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { TimerProvider, useTimer } from "@/components/TimerProvider";
import { DashboardBento, ExamRecord } from "@/components/DashboardBento";
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
import {
  HabitsVaultPanel,
  HabitRecord,
  ResourceRecord,
  ReflectionRecord,
} from "@/components/HabitsVaultPanel";
import {
  GoalsTimeblockPanel,
  GoalRecord,
  TimeBlockRecord,
} from "@/components/GoalsTimeblockPanel";
import {
  ExtendedUserProfile,
  StudioSettingsPanel,
} from "@/components/StudioSettingsPanel";

type TabId =
  | "dashboard"
  | "focus"
  | "schedule"
  | "planner"
  | "goals"
  | "habits"
  | "roadmaps"
  | "knowledge"
  | "analytics"
  | "settings";

const NAV_DEF: { id: TabId; icon: typeof Timer }[] = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "focus", icon: Timer },
  { id: "schedule", icon: CalendarDays },
  { id: "planner", icon: CheckSquare },
  { id: "goals", icon: Target },
  { id: "habits", icon: Sparkles },
  { id: "roadmaps", icon: MapIcon },
  { id: "knowledge", icon: BookMarked },
  { id: "analytics", icon: BarChart3 },
  { id: "settings", icon: Sliders },
];

function MiniTimerBadge({ onOpenFocus }: { onOpenFocus: () => void }) {
  const timer = useTimer();
  if (!timer.isRunning && !timer.activeSessionId) return null;

  return (
    <div className="animate-pop inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-1 text-xs">
      <button
        type="button"
        onClick={onOpenFocus}
        className="flex items-center gap-1.5 font-mono font-semibold tabular-nums text-[var(--accent)]"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full bg-[var(--accent)]",
            timer.isRunning && "animate-pulse"
          )}
        />
        {formatDuration(timer.secondsLeft)}
      </button>
      <button
        type="button"
        onClick={() => (timer.isRunning ? timer.pause() : timer.start())}
        className="rounded-md p-0.5 text-[var(--accent)] hover:bg-[var(--bg-surface)]"
      >
        {timer.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function KronoFlowWorkspace({
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
  goals,
  timeBlocks,
  habits,
  resources,
  reflections,
  dbStatus,
  themeId,
  customAccent,
  fontStyle,
  wallpaper,
  onApplyLocalTheme,
  onLogout,
  onRefresh,
}: {
  user: ExtendedUserProfile | null;
  subjects: SubjectRecord[];
  todos: TodoItem[];
  roadmaps: RoadmapRecord[];
  sessions: SessionLogItem[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  exams: ExamRecord[];
  slots: ScheduleSlotRecord[];
  grades: GradeRecord[];
  goals: GoalRecord[];
  timeBlocks: TimeBlockRecord[];
  habits: HabitRecord[];
  resources: ResourceRecord[];
  reflections: ReflectionRecord[];
  dbStatus: "checking" | "connected" | "disconnected";
  themeId: string;
  customAccent: string | null;
  fontStyle: string;
  wallpaper: string;
  onApplyLocalTheme: (t: string, w: string, acc: string | null, f: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [focusedTaskTitle, setFocusedTaskTitle] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    applyThemeToDocument(themeId, customAccent, fontStyle);
  }, [themeId, customAccent, fontStyle]);

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
      habits,
      resources,
      reflections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-v8-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Đã tải xuống tệp sao lưu JSON!");
  };

  const wpPreset = WALLPAPERS.find((w) => w.id === wallpaper);
  const bgStyle: React.CSSProperties = wallpaper.startsWith("http")
    ? {
        backgroundImage: `linear-gradient(rgba(15,23,42,0.52), rgba(15,23,42,0.62)), url(${wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : wallpaper === "dots" || wallpaper === "grid"
    ? { backgroundImage: wpPreset?.style, backgroundSize: "22px 22px" }
    : { backgroundImage: wpPreset?.style ?? "none" };

  return (
    <div className="min-h-screen lg:flex" style={bgStyle}>
      <aside
        className={cn(
          "hidden shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition-all duration-200 lg:flex",
          sidebarCollapsed ? "w-[74px]" : "w-64"
        )}
      >
        <div>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="btn-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                KF
              </span>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <h1 className="text-sm font-semibold text-[var(--text-primary)]">KronoFlow</h1>
                  <p className="text-[11px] text-[var(--text-muted)]">Studio v10</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {NAV_DEF.map((item) => {
              const Icon = item.icon;
              const label = t(`nav_${item.id}`);
              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium",
                    sidebarCollapsed && "justify-center px-0",
                    tab === item.id
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-4">
          <div
            className={cn(
              "flex items-center text-xs text-[var(--text-muted)]",
              sidebarCollapsed ? "flex-col gap-2" : "justify-between px-1"
            )}
          >
            <span className="flex items-center gap-1.5" title="PostgreSQL">
              <Database
                className={cn(
                  "h-3.5 w-3.5",
                  dbStatus === "connected" ? "text-emerald-500" : "text-rose-500"
                )}
              />
              {!sidebarCollapsed && (dbStatus === "connected" ? "PostgreSQL" : "Offline")}
            </span>
            <button
              type="button"
              onClick={onLogout}
              title={t("logout")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-rose-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              {!sidebarCollapsed && t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 pb-24 lg:pb-10">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-8">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t(`nav_${tab}`)}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">{t(`nav_${tab}_desc`)}</p>
          </div>

          <div className="flex items-center gap-2">
            {tab !== "focus" && <MiniTimerBadge onOpenFocus={() => setTab("focus")} />}
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5" />
              <span>{t("quickJump")}</span>
              <kbd className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl+K
              </kbd>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:text-rose-500 lg:hidden"
              title={t("logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main key={tab} className="animate-tab-in mx-auto max-w-6xl px-4 py-6 sm:px-8">
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
              onRefresh={onRefresh}
            />
          )}
          {tab === "focus" && (
            <PomodoroTimer
              subjects={subjects}
              sessions={sessions}
              focusedTaskTitle={focusedTaskTitle}
              onClearFocusedTask={() => setFocusedTaskTitle(null)}
            />
          )}
          {tab === "schedule" && (
            <ScheduleGpaPanel slots={slots} grades={grades} onRefresh={onRefresh} />
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
              onRefresh={onRefresh}
            />
          )}
          {tab === "goals" && (
            <GoalsTimeblockPanel
              goals={goals}
              timeBlocks={timeBlocks}
              onNotify={notify}
              onRefresh={onRefresh}
            />
          )}
          {tab === "habits" && (
            <HabitsVaultPanel
              subjects={subjects}
              goals={goals}
        timeBlocks={timeBlocks}
        habits={habits}
              resources={resources}
              reflections={reflections}
              onNotify={notify}
              onRefresh={onRefresh}
            />
          )}
          {tab === "roadmaps" && <RoadmapPanel roadmaps={roadmaps} onRefresh={onRefresh} />}
          {tab === "knowledge" && (
            <NotesFlashcardsPanel
              subjects={subjects}
              notes={notes}
              flashcards={flashcards}
              onRefresh={onRefresh}
            />
          )}
          {tab === "analytics" && (
            <AnalyticsPanel
              sessions={sessions}
              subjects={subjects}
              totalHabits={habits.length}
              totalCards={flashcards.length}
            />
          )}
          {tab === "settings" && (
            <StudioSettingsPanel
              user={user}
              onApplyLocalTheme={onApplyLocalTheme}
              onExportBackup={handleExportBackup}
              onRefresh={onRefresh}
            />
          )}
        </main>
      </div>

      {toast && (
        <div className="animate-pop fixed bottom-20 right-5 z-50 flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-xl lg:bottom-6">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {toast}
        </div>
      )}

      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-24 backdrop-blur-sm"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="animate-pop w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {t("quickJump")}
              </span>
              <button type="button" onClick={() => setCmdOpen(false)}>
                <X className="h-4 w-4 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
              {NAV_DEF.map((item) => {
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
                      {t(`nav_${item.id}`)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {t(`nav_${item.id}_desc`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:hidden">
        {NAV_DEF.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-w-[66px] flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                tab === item.id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`nav_${item.id}`)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function AppShell() {
  const { t } = useLang();
  const [authState, setAuthState] = useState<"loading" | "guest" | "authed">("loading");
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [themeId, setThemeId] = useState("ivory");
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState("editorial");
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
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockRecord[]>([]);
  const [habits, setHabits] = useState<HabitRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [reflections, setReflections] = useState<ReflectionRecord[]>([]);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  const loadAll = useCallback(async () => {
    try {
      const [hRes, uRes] = await Promise.all([fetch("/api/health"), fetch("/api/user")]);
      setDbStatus(hRes.ok ? "connected" : "disconnected");

      if (uRes.status === 401) {
        setAuthState("guest");
        return;
      }

      if (uRes.ok) {
        const u: ExtendedUserProfile = (await uRes.json()).data;
        setUser(u);
        if (u?.theme) setThemeId(u.theme);
        setCustomAccent(u?.customAccent ?? null);
        if (u?.fontStyle) setFontStyle(u.fontStyle);
        if (u?.wallpaper) setWallpaper(u.wallpaper);
        setAuthState("authed");
      }

      const [sRes, tRes, rRes, seRes, nRes, cRes, eRes, scRes, gRes, hbRes, resRes, refRes, glRes, tbRes] =
        await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/todos"),
          fetch("/api/roadmaps"),
          fetch("/api/sessions"),
          fetch("/api/notes"),
          fetch("/api/flashcards"),
          fetch("/api/exams"),
          fetch("/api/schedule"),
          fetch("/api/grades"),
          fetch("/api/habits"),
          fetch("/api/resources"),
          fetch("/api/reflections"),
          fetch("/api/goals"),
          fetch("/api/timeblocks"),
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
      if (hbRes.ok) setHabits((await hbRes.json()).data ?? []);
      if (resRes.ok) setResources((await resRes.json()).data ?? []);
      if (refRes.ok) setReflections((await refRes.json()).data ?? []);
      if (glRes.ok) setGoals((await glRes.json()).data ?? []);
      if (tbRes.ok) setTimeBlocks((await tbRes.json()).data ?? []);
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

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] text-sm text-[var(--text-muted)]">
        {t("loadingSpace")}
      </div>
    );
  }

  if (authState === "guest") {
    return <AuthScreen onSuccess={loadAll} />;
  }

  return (
    <TimerProvider onSessionCompleted={loadAll}>
      <KronoFlowWorkspace
        user={user}
        subjects={subjects}
        todos={todos}
        roadmaps={roadmaps}
        sessions={sessions}
        notes={notes}
        flashcards={flashcards}
        exams={exams}
        slots={slots}
        grades={grades}
        goals={goals}
        timeBlocks={timeBlocks}
        habits={habits}
        resources={resources}
        reflections={reflections}
        dbStatus={dbStatus}
        themeId={themeId}
        customAccent={customAccent}
        fontStyle={fontStyle}
        wallpaper={wallpaper}
        onApplyLocalTheme={(tId, wp, acc, f) => {
          setThemeId(tId);
          setWallpaper(wp);
          setCustomAccent(acc);
          setFontStyle(f);
        }}
        onLogout={handleLogout}
        onRefresh={loadAll}
      />
    </TimerProvider>
  );
}

export default function HomePage() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}
