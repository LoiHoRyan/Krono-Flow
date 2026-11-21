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
  Wallet,
  Sliders,
  Database,
  Command,
  LogOut,
  Play,
  Pause,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  NotebookPen,
  X,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { applyThemeToDocument, WALLPAPERS } from "@/lib/themes";
import { LanguageProvider, LanguageToggle, useLang } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { QuickScratchpad } from "@/components/QuickScratchpad";
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
import { ExpensesPanel, ExpenseRecord } from "@/components/ExpensesPanel";
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
  | "expenses"
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
  { id: "expenses", icon: Wallet },
  { id: "analytics", icon: BarChart3 },
  { id: "settings", icon: Sliders },
];

const NAV_GROUPS: { titleVi: string; titleEn: string; ids: TabId[] }[] = [
  { titleVi: "Không gian chính", titleEn: "Workspace", ids: ["dashboard", "focus"] },
  { titleVi: "Kế hoạch & Học tập", titleEn: "Planning", ids: ["schedule", "planner", "goals"] },
  { titleVi: "Kiến thức & Thói quen", titleEn: "Knowledge", ids: ["habits", "roadmaps", "knowledge"] },
  { titleVi: "Tài chính & Hệ thống", titleEn: "Insights", ids: ["expenses", "analytics", "settings"] },
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

interface WorkspaceProps {
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
  expenses: ExpenseRecord[];
  dbStatus: "checking" | "connected" | "disconnected";
  themeId: string;
  customAccent: string | null;
  fontStyle: string;
  borderRadius: string;
  wallpaper: string;
  onApplyLocalTheme: (t: string, w: string, acc: string | null, f: string, r: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
}

function KronoFlowWorkspace(props: WorkspaceProps) {
  const { lang, t } = useLang();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [padOpen, setPadOpen] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [focusedTaskTitle, setFocusedTaskTitle] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setConfettiKey((k) => k + 1);
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    applyThemeToDocument(props.themeId, props.customAccent, props.fontStyle, props.borderRadius);
  }, [props.themeId, props.customAccent, props.fontStyle, props.borderRadius]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
        setPadOpen(false);
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "/") {
        e.preventDefault();
        setCmdOpen(true);
      } else if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setPadOpen((v) => !v);
      } else if (e.key.toLowerCase() === "b" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: props.user,
      subjects: props.subjects,
      todos: props.todos,
      roadmaps: props.roadmaps,
      sessions: props.sessions,
      notes: props.notes,
      flashcards: props.flashcards,
      exams: props.exams,
      slots: props.slots,
      grades: props.grades,
      goals: props.goals,
      timeBlocks: props.timeBlocks,
      habits: props.habits,
      resources: props.resources,
      reflections: props.reflections,
      expenses: props.expenses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-v15-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Đã tải xuống tệp sao lưu JSON!");
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayFocusedMins = props.sessions
    .filter((s) => s.status === "completed" && s.startedAt.slice(0, 10) === todayIso)
    .reduce((a, b) => a + b.actualMinutes, 0);
  const headerGoalPct = Math.min(
    100,
    Math.round((todayFocusedMins / Math.max(1, props.user?.dailyGoalMinutes ?? 120)) * 100)
  );

  const wpPreset = WALLPAPERS.find((w) => w.id === props.wallpaper);
  const bgStyle: React.CSSProperties = props.wallpaper.startsWith("http")
    ? {
        backgroundImage: `linear-gradient(rgba(15,23,42,0.52), rgba(15,23,42,0.62)), url(${props.wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : props.wallpaper === "dots" || props.wallpaper === "grid"
    ? { backgroundImage: wpPreset?.style, backgroundSize: "22px 22px" }
    : { backgroundImage: wpPreset?.style ?? "none" };

  return (
    <div className="relative min-h-screen lg:flex" style={bgStyle}>
      <ConfettiBurst triggerKey={confettiKey} />
      <QuickScratchpad open={padOpen} onClose={() => setPadOpen(false)} />

      {/* FIXED FULL-HIDE SIDEBAR (0px hoàn toàn khi bấm ẩn) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col justify-between bg-[var(--bg-surface)] transition-all duration-300 ease-out lg:flex",
          sidebarOpen
            ? "w-64 border-r border-[var(--border-subtle)] p-4 opacity-100"
            : "pointer-events-none w-0 overflow-hidden border-r-0 p-0 opacity-0"
        )}
      >
        <div className="w-56">
          <div className="flex items-center gap-2.5 px-1">
            <span className="btn-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
              KF
            </span>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">KronoFlow</h1>
              <p className="text-[11px] text-[var(--text-muted)]">Studio v15</p>
            </div>
          </div>

          <nav className="mt-5 space-y-4">
            {NAV_GROUPS.map((grp) => (
              <div key={grp.titleEn}>
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {lang === "vi" ? grp.titleVi : grp.titleEn}
                </div>
                <div className="space-y-0.5">
                  {grp.ids.map((id) => {
                    const item = NAV_DEF.find((n) => n.id === id);
                    if (!item) return null;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium",
                          tab === item.id
                            ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(`nav_${item.id}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="w-56 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Database
                className={cn(
                  "h-3.5 w-3.5",
                  props.dbStatus === "connected" ? "text-emerald-500" : "text-rose-500"
                )}
              />
              {props.dbStatus === "connected" ? "PostgreSQL" : "Offline"}
            </span>
            <button
              type="button"
              onClick={props.onLogout}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-rose-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-10">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? t("collapseSidebar") : t("expandSidebar")}
              className="hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] lg:inline-flex"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <div>
              <h2 className="text-base font-medium text-[var(--text-primary)]">
                {t(`nav_${tab}`)}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{t(`nav_${tab}_desc`)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tab !== "focus" && <MiniTimerBadge onOpenFocus={() => setTab("focus")} />}
            <button
              type="button"
              onClick={() => setPadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <NotebookPen className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Nháp</span>
            </button>
            <span
              title="Tiến độ mục tiêu tập trung hôm nay"
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono text-[11px] font-medium text-[var(--accent)] md:inline-flex"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {headerGoalPct}%
            </span>
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setTab("settings")}
              title={props.user?.name ?? "Hồ sơ"}
              className="h-8 w-8 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
            >
              {props.user?.avatarUrl ? (
                <img src={props.user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-[var(--accent)]">
                  {(props.user?.name ?? "KF").slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5" />
              <kbd className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl+K
              </kbd>
            </button>
            <button
              type="button"
              onClick={props.onLogout}
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
              user={props.user}
              subjects={props.subjects}
              sessions={props.sessions}
              todos={props.todos}
              roadmaps={props.roadmaps}
              flashcards={props.flashcards}
              exams={props.exams}
              timeBlocks={props.timeBlocks}
              onJumpFocus={(title) => {
                if (title) setFocusedTaskTitle(title);
                setTab("focus");
              }}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "focus" && (
            <PomodoroTimer
              subjects={props.subjects}
              sessions={props.sessions}
              focusedTaskTitle={focusedTaskTitle}
              onClearFocusedTask={() => setFocusedTaskTitle(null)}
              onSessionSaved={() => {
                notify("Đã lưu phiên tập trung vào PostgreSQL!");
                props.onRefresh();
              }}
            />
          )}
          {tab === "schedule" && (
            <ScheduleGpaPanel
              slots={props.slots}
              grades={props.grades}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "planner" && (
            <SubjectTodoPanel
              subjects={props.subjects}
              todos={props.todos}
              sessions={props.sessions}
              onFocusTask={(title) => {
                setFocusedTaskTitle(title);
                setTab("focus");
              }}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "goals" && (
            <GoalsTimeblockPanel
              goals={props.goals}
              timeBlocks={props.timeBlocks}
              onNotify={notify}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "habits" && (
            <HabitsVaultPanel
              subjects={props.subjects}
              habits={props.habits}
              resources={props.resources}
              reflections={props.reflections}
              onNotify={notify}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "roadmaps" && (
            <RoadmapPanel roadmaps={props.roadmaps} onRefresh={props.onRefresh} />
          )}
          {tab === "knowledge" && (
            <NotesFlashcardsPanel
              subjects={props.subjects}
              notes={props.notes}
              flashcards={props.flashcards}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "expenses" && (
            <ExpensesPanel
              expenses={props.expenses}
              onNotify={notify}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "analytics" && (
            <AnalyticsPanel
              sessions={props.sessions}
              subjects={props.subjects}
              totalHabits={props.habits.length}
              totalCards={props.flashcards.length}
            />
          )}
          {tab === "settings" && (
            <StudioSettingsPanel
              user={props.user}
              onApplyLocalTheme={props.onApplyLocalTheme}
              onExportBackup={handleExportBackup}
              onRefresh={props.onRefresh}
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
            <input
              type="text"
              autoFocus
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              placeholder="Tìm nhanh tab, công việc, ghi chú, tài liệu..."
              className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
              {cmdQuery.trim().length > 0 && (
                <>
                  {props.todos
                    .filter((x) => x.title.toLowerCase().includes(cmdQuery.toLowerCase()))
                    .slice(0, 4)
                    .map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          setTab("planner");
                          setCmdOpen(false);
                          setCmdQuery("");
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      >
                        <span className="truncate">✓ {x.title}</span>
                        <span className="text-[10px] text-[var(--accent)]">Công việc</span>
                      </button>
                    ))}
                  {props.notes
                    .filter((x) => x.title.toLowerCase().includes(cmdQuery.toLowerCase()))
                    .slice(0, 4)
                    .map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          setTab("knowledge");
                          setCmdOpen(false);
                          setCmdQuery("");
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      >
                        <span className="truncate">✎ {x.title}</span>
                        <span className="text-[10px] text-[var(--accent)]">Ghi chú</span>
                      </button>
                    ))}
                </>
              )}
              {NAV_DEF.filter((item) =>
                t(`nav_${item.id}`).toLowerCase().includes(cmdQuery.toLowerCase())
              ).map((item) => {
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
  const [themeId, setThemeId] = useState("pure-white");
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState("editorial");
  const [borderRadius, setBorderRadius] = useState("normal");
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
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
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
        if (u?.borderRadius) setBorderRadius(u.borderRadius);
        if (u?.wallpaper) setWallpaper(u.wallpaper);
        setAuthState("authed");
      }

      const [
        sRes,
        tRes,
        rRes,
        seRes,
        nRes,
        cRes,
        eRes,
        scRes,
        gRes,
        hbRes,
        resRes,
        refRes,
        glRes,
        tbRes,
        exRes,
      ] = await Promise.all([
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
        fetch("/api/expenses"),
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
      if (exRes.ok) setExpenses((await exRes.json()).data ?? []);
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
        expenses={expenses}
        dbStatus={dbStatus}
        themeId={themeId}
        customAccent={customAccent}
        fontStyle={fontStyle}
        borderRadius={borderRadius}
        wallpaper={wallpaper}
        onApplyLocalTheme={(tId, wp, acc, f, r) => {
          setThemeId(tId);
          setWallpaper(wp);
          setCustomAccent(acc);
          setFontStyle(f);
          setBorderRadius(r);
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
