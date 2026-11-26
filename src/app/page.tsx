"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Timer,
  CalendarDays,
  CheckSquare,
  Map as MapIcon,
  BarChart3,
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
  Plus,
  HelpCircle,
  Bot,
  X,
  Pin,
  Undo2,
  Terminal,
  Sun,
  Eye,
  EyeOff,
  Code2,
  BellRing,
  MoonStar,
  WifiOff,
  ChevronDown,
  ChevronRight,
  BellOff,
  Bell,
  ArrowUp,
  Flame,
  RefreshCw,
  Monitor,
  Music2,
  Search,
  LayoutGrid,
  BookMarked,
  ChevronsRight,
  Maximize2,
  Moon,
} from "lucide-react";
import { cn, formatDuration, normalizeVi } from "@/lib/utils";
import { playUiTick } from "@/lib/ui-sounds";
import { applyThemeToDocument, WALLPAPERS } from "@/lib/themes";
import { LanguageProvider, LanguageToggle, useLang } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { QuickScratchpad } from "@/components/QuickScratchpad";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { AiCopilotDrawer } from "@/components/AiCopilotDrawer";
import { WeeklyReviewModal } from "@/components/WeeklyReviewModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { CheatSheetModal } from "@/components/CheatSheetModal";
import { LastMinuteCramModal } from "@/components/LastMinuteCramModal";
import { StandbyClockModal } from "@/components/StandbyClockModal";
import { MediaPlayerWidget } from "@/components/MediaPlayerWidget";
import { StudyAllocatorModal } from "@/components/StudyAllocatorModal";
import { ExamToolkitModal } from "@/components/ExamToolkitModal";
import { EyeCareToggle } from "@/components/EyeCareToggle";
import { StudyWhiteboardModal } from "@/components/StudyWhiteboardModal";
import { GlobalSpotlightModal } from "@/components/GlobalSpotlightModal";
import { StudentUtilitiesModal } from "@/components/StudentUtilitiesModal";
import { StudyDockDrawer } from "@/components/StudyDockDrawer";
import { StickyNotesOverlay } from "@/components/StickyNotesOverlay";
import { ProStudySuiteModal } from "@/components/ProStudySuiteModal";
import { TechFinanceLabModal } from "@/components/TechFinanceLabModal";
import { ExamPacerMeetingModal } from "@/components/ExamPacerMeetingModal";
import { QuickPortalAndDailyModal } from "@/components/QuickPortalAndDailyModal";
import { MindReadVocabModal } from "@/components/MindReadVocabModal";
import { LifeBalancePinModal } from "@/components/LifeBalancePinModal";
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
  MistakeRecord,
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
  BookRecord,
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

function TopFocusBar() {
  const timer = useTimer();
  if (!timer.isRunning) return null;
  const total = Math.max(1, timer.customMinutes * 60);
  const pct = Math.min(100, Math.round(((total - timer.secondsLeft) / total) * 100));
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] bg-transparent">
      <div
        className="h-full bg-[var(--accent)] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

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
  books: BookRecord[];
  mistakes: MistakeRecord[];
  dbStatus: "checking" | "connected" | "disconnected";
  themeId: string;
  customAccent: string | null;
  fontStyle: string;
  borderRadius: string;
  wallpaper: string;
  onApplyLocalTheme: (t: string, w: string, acc: string | null, f: string, r: string) => void;
  onApplyLocalAvatar: (url: string | null) => void;
  onLogout: () => void;
  onRefresh: () => void;
}

function KronoFlowWorkspace(props: WorkspaceProps) {
  const { lang, t } = useLang();
  const [tab, setTabRaw] = useState<TabId>("dashboard");
  const [isOffline, setIsOffline] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [scrollMap, setScrollMap] = useState<Record<string, number>>({});

  const setTab = useCallback(
    (next: TabId) => {
      if (typeof window !== "undefined") {
        setScrollMap((prev) => ({ ...prev, [tab]: window.scrollY }));
      }
      if (next !== "dashboard") {
        localStorage.setItem("kronoflow-last-context", next);
      }
      setTabRaw(next);
      localStorage.setItem("kronoflow-last-tab", next);
      playUiTick("tab");
      setTimeout(() => {
        const y = scrollMap[next] ?? 0;
        if (typeof window !== "undefined") window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      }, 40);
    },
    [tab, scrollMap]
  );

  useEffect(() => {
    const savedTab = localStorage.getItem("kronoflow-last-tab") as TabId | null;
    if (savedTab && NAV_DEF.some((n) => n.id === savedTab)) {
      setTabRaw(savedTab);
    }
    if (localStorage.getItem("kronoflow-high-contrast") === "on") {
      document.documentElement.classList.add("high-contrast");
    }
    if (localStorage.getItem("kronoflow-eink") === "on") {
      document.documentElement.classList.add("eink-mode");
    }
    if (localStorage.getItem("kronoflow-reduce-motion") === "on") {
      document.documentElement.classList.add("reduce-motion");
    }
    if (localStorage.getItem("kronoflow-btn-pill") === "on") {
      document.documentElement.classList.add("btn-pill");
    }
    if (localStorage.getItem("kronoflow-flat-cards") === "on") {
      document.documentElement.classList.add("flat-cards");
    }
    const onScroll = () => setShowScrollTop(window.scrollY > 360);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (localStorage.getItem("kronoflow-hide-hints") === "1") {
      setShowHints(false);
    }
    const goOff = () => setIsOffline(true);
    const goOn = () => {
      setIsOffline(false);
      props.onRefresh();
    };
    setIsOffline(!navigator.onLine);
    window.addEventListener("offline", goOff);
    window.addEventListener("online", goOn);
    const syncHidden = () => {
      try {
        const raw = localStorage.getItem("kronoflow-hidden-tabs");
        setHiddenTabs(raw ? JSON.parse(raw) : []);
      } catch {
        setHiddenTabs([]);
      }
    };
    syncHidden();
    window.addEventListener("kronoflow-sidebar-change", syncHidden);
    const syncLayout = () => setWideLayout(localStorage.getItem("kronoflow-wide-layout") === "on");
    syncLayout();
    window.addEventListener("kronoflow-layout-change", syncLayout);
    return () => {
      window.removeEventListener("offline", goOff);
      window.removeEventListener("online", goOn);
      window.removeEventListener("kronoflow-sidebar-change", syncHidden);
      window.removeEventListener("kronoflow-layout-change", syncLayout);
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sidebarMode, setSidebarMode] = useState<"full" | "compact" | "hidden">("full");
  const [pinnedTabs, setPinnedTabs] = useState<TabId[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [padOpen, setPadOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cramOpen, setCramOpen] = useState(false);
  const [standbyOpen, setStandbyOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [allocatorOpen, setAllocatorOpen] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [utilsOpen, setUtilsOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [stickyOpen, setStickyOpen] = useState(false);
  const [proSuiteOpen, setProSuiteOpen] = useState(false);
  const [techLabOpen, setTechLabOpen] = useState(false);
  const [pacerOpen, setPacerOpen] = useState(false);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [mindReadOpen, setMindReadOpen] = useState(false);
  const [lifePinOpen, setLifePinOpen] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setToolbarCollapsed(localStorage.getItem("kronoflow-toolbar-collapsed") === "on");
    } catch {
      // ignore
    }
  }, []);

  const toggleToolbarCollapsed = () => {
    setToolbarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kronoflow-toolbar-collapsed", next ? "on" : "off");
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [showExamPill, setShowExamPill] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
  const [privacyMode, setPrivacyMode] = useState(false);
  const [dndMode, setDndMode] = useState(false);
  const [fabLeft, setFabLeft] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [wideLayout, setWideLayout] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleSafeLogout = () => {
    const hasDraft = Boolean(localStorage.getItem("kronoflow-draft-note"));
    if (hasDraft && !window.confirm("Bạn đang có bản nháp Ghi chú chưa lưu. Vẫn muốn đăng xuất?")) {
      return;
    }
    props.onLogout();
  };
  const [warmLevel, setWarmLevel] = useState(0);
  const [fontScale, setFontScale] = useState<"95%" | "100%" | "108%">("100%");
  const [bedtimeWarning, setBedtimeWarning] = useState<string | null>(null);

  const cycleFontScale = () => {
    const next: "95%" | "100%" | "108%" =
      fontScale === "100%" ? "108%" : fontScale === "108%" ? "95%" : "100%";
    setFontScale(next);
    localStorage.setItem("kronoflow-font-scale", next);
    document.documentElement.style.fontSize = next;
    notify(`Cỡ chữ toàn trang: ${next === "95%" ? "Gọn (95%)" : next === "108%" ? "Lớn (108%)" : "Gốc (100%)"}`);
  };

  const [upcomingClass, setUpcomingClass] = useState<{ title: string; startTime: string; location: string | null } | null>(null);

  useEffect(() => {
    const savedScale = localStorage.getItem("kronoflow-font-scale");
    if (savedScale === "95%" || savedScale === "100%" || savedScale === "108%") {
      setFontScale(savedScale);
      document.documentElement.style.fontSize = savedScale;
    }
    const checkBed = () => {
      const bed = localStorage.getItem("kronoflow-bedtime") || "23:30";
      const [bh, bm] = bed.split(":").map(Number);
      const now = new Date();
      const curM = now.getHours() * 60 + now.getMinutes();
      const bedM = (bh ?? 23) * 60 + (bm ?? 30);
      const diff = bedM - curM;
      if (diff <= 30 && diff >= -90) {
        setBedtimeWarning(`Sắp đến giờ đi ngủ (${bed}) — hãy hoàn tất phiên hiện tại và nghỉ ngơi sớm nhé!`);
      } else {
        setBedtimeWarning(null);
      }
    };
    checkBed();
    const bedId = setInterval(checkBed, 60000);
    return () => clearInterval(bedId);
    const savedGlass = Number(localStorage.getItem("kronoflow-glass-opacity") || "96");
    if (!isNaN(savedGlass)) {
      document.documentElement.style.setProperty("--glass-opacity", String(savedGlass / 100));
    }
  }, []);

  useEffect(() => {
    const checkClass = () => {
      const now = new Date();
      const dow = now.getDay() === 0 ? 7 : now.getDay();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const soon = props.slots.find((sl) => {
        if (sl.dayOfWeek !== dow) return false;
        const [h, m] = sl.startTime.split(":").map(Number);
        const startMins = (h ?? 0) * 60 + (m ?? 0);
        const diff = startMins - nowMins;
        return diff >= 0 && diff <= 15;
      });
      setUpcomingClass(soon ? { title: soon.title, startTime: soon.startTime, location: soon.location } : null);
    };
    checkClass();
    const id = setInterval(checkClass, 60000);
    return () => clearInterval(id);
  }, [props.slots]);

  useEffect(() => {
    const syncWarm = () => {
      const v = Number(localStorage.getItem("kronoflow-warm-filter") || "0");
      setWarmLevel(isNaN(v) ? 0 : v);
    };
    syncWarm();
    window.addEventListener("kronoflow-warm-change", syncWarm);
    return () => window.removeEventListener("kronoflow-warm-change", syncWarm);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("privacy-mode", privacyMode);
  }, [privacyMode]);

  const cycleWarm = () => {
    const next = warmLevel === 0 ? 20 : warmLevel === 20 ? 40 : 0;
    setWarmLevel(next);
    localStorage.setItem("kronoflow-warm-filter", String(next));
  };
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [focusedTaskTitle, setFocusedTaskTitle] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; onUndo?: () => Promise<void> } | null>(null);

  const notify = useCallback((msg: string) => {
    setToast({ msg });
    setConfettiKey((k) => k + 1);
    setTimeout(() => setToast((cur) => (cur?.msg === msg ? null : cur)), 3000);
  }, []);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;
    const setupWellness = () => {
      if (timerId) clearInterval(timerId);
      const mins = Number(localStorage.getItem("kronoflow-wellness-mins") || "0");
      if (mins > 0) {
        timerId = setInterval(() => {
          if (localStorage.getItem("kronoflow-dnd") !== "on") {
            notify(`Đã qua ${mins} phút — hãy đứng dậy vươn vai và uống 1 ngụm nước nhé!`);
          }
        }, mins * 60 * 1000);
      }
    };
    setupWellness();
    window.addEventListener("kronoflow-wellness-change", setupWellness);
    return () => {
      if (timerId) clearInterval(timerId);
      window.removeEventListener("kronoflow-wellness-change", setupWellness);
    };
  }, [notify]);

  const notifyUndoable = useCallback((msg: string, onUndo: () => Promise<void>) => {
    setToast({ msg, onUndo });
    setTimeout(() => setToast((cur) => (cur?.msg === msg ? null : cur)), 5500);
  }, []);

  useEffect(() => {
    try {
      const savedPins = localStorage.getItem("kronoflow-pinned-nav");
      if (savedPins) setPinnedTabs(JSON.parse(savedPins));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (
      props.user &&
      props.subjects.length === 0 &&
      props.sessions.length === 0 &&
      !localStorage.getItem("kronoflow-onboarded")
    ) {
      setOnboardingOpen(true);
    }
  }, [props.user, props.subjects.length, props.sessions.length]);

  const togglePinTab = (id: TabId) => {
    const next = pinnedTabs.includes(id)
      ? pinnedTabs.filter((x) => x !== id)
      : [...pinnedTabs, id].slice(0, 4);
    setPinnedTabs(next);
    localStorage.setItem("kronoflow-pinned-nav", JSON.stringify(next));
  };

  const cycleSidebar = () => {
    setSidebarMode((m) => (m === "full" ? "compact" : m === "compact" ? "hidden" : "full"));
  };

  useEffect(() => {
    const autoMode = localStorage.getItem("kronoflow-auto-theme") === "on";
    const hr = new Date().getHours();
    const effectiveTheme = autoMode ? (hr >= 19 || hr < 6 ? "nord-slate" : "pure-white") : props.themeId;
    applyThemeToDocument(effectiveTheme, props.customAccent, props.fontStyle, props.borderRadius);
    const savedDensity = localStorage.getItem("kronoflow-density");
    document.documentElement.classList.toggle("compact-ui", savedDensity === "compact");
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
        setQuickOpen(false);
        setHelpOpen(false);
        setAiOpen(false);
        setStandbyOpen(false);
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
        setSidebarMode((m) => (m === "full" ? "compact" : m === "compact" ? "hidden" : "full"));
      } else if (e.key.toLowerCase() === "q" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setQuickOpen((v) => !v);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setAiOpen((v) => !v);
      } else if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setPrivacyMode((v) => !v);
      } else if (e.altKey && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        const tabList: TabId[] = ["dashboard", "focus", "schedule", "planner", "goals", "habits", "roadmaps", "knowledge"];
        const target = tabList[Number(e.key) - 1];
        if (target) setTab(target);
      } else if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleToolbarCollapsed();
      } else if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setToolbarCollapsed((v) => {
          const next = !v;
          try {
            localStorage.setItem("kronoflow-toolbar-collapsed", next ? "on" : "off");
          } catch {
            // ignore
          }
          setSidebarMode(next ? "hidden" : "full");
          return next;
        });
      } else if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setDockOpen((v) => !v);
      } else if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSpotlightOpen((v) => !v);
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setStandbyOpen((v) => !v);
      } else if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('main input[type="text"]');
        if (el) el.focus();
      } else if (e.altKey && e.key >= "1" && e.key <= "9") {
        const target = NAV_DEF[Number(e.key) - 1];
        if (target) {
          e.preventDefault();
          setTab(target.id);
        }
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
    a.download = `kronoflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    localStorage.setItem("kronoflow-last-backup", new Date().toISOString());
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
      <TopFocusBar />
      <ConfettiBurst triggerKey={confettiKey} />
      <QuickScratchpad open={padOpen} onClose={() => setPadOpen(false)} />
      <ShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AiCopilotDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onNotify={notify}
        onRefresh={props.onRefresh}
      />
      <WeeklyReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        sessions={props.sessions}
        todos={props.todos}
        onRefresh={props.onRefresh}
        onNotify={notify}
      />
      {warmLevel > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[70] transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(255, 166, 77, ${warmLevel / 180})`,
            mixBlendMode: "multiply",
          }}
        />
      )}
      <CheatSheetModal open={cheatOpen} onClose={() => setCheatOpen(false)} />
      <StandbyClockModal open={standbyOpen} onClose={() => setStandbyOpen(false)} exams={props.exams} />
      <StudyAllocatorModal open={allocatorOpen} onClose={() => setAllocatorOpen(false)} subjects={props.subjects} />
      <ExamToolkitModal open={toolkitOpen} onClose={() => setToolkitOpen(false)} subjects={props.subjects} notes={props.notes} mistakes={props.mistakes} exams={props.exams} />
      <StudyWhiteboardModal open={whiteboardOpen} onClose={() => setWhiteboardOpen(false)} />
      <GlobalSpotlightModal open={spotlightOpen} onClose={() => setSpotlightOpen(false)} subjects={props.subjects} todos={props.todos} notes={props.notes} flashcards={props.flashcards} exams={props.exams} onJumpTab={(t) => setTab(t)} />
      <StudentUtilitiesModal open={utilsOpen} onClose={() => setUtilsOpen(false)} subjects={props.subjects} />
      <StudyDockDrawer
        open={dockOpen}
        onClose={() => setDockOpen(false)}
        onOpenSpotlight={() => setSpotlightOpen(true)}
        onOpenWhiteboard={() => setWhiteboardOpen(true)}
        onOpenAllocator={() => setAllocatorOpen(true)}
        onOpenToolkit={() => setToolkitOpen(true)}
        onOpenUtils={() => setUtilsOpen(true)}
        onOpenProSuite={() => setProSuiteOpen(true)}
        onToggleSticky={() => setStickyOpen((v) => !v)}
        onOpenStandby={() => setStandbyOpen(true)}
        onToggleMedia={() => setMediaOpen((v) => !v)}
        onOpenTechLab={() => setTechLabOpen(true)}
        onOpenPacer={() => setPacerOpen(true)}
        onOpenPortals={() => setPortalsOpen(true)}
        onOpenMindRead={() => setMindReadOpen(true)}
        onOpenLifePin={() => setLifePinOpen(true)}
      />
      <MindReadVocabModal open={mindReadOpen} onClose={() => setMindReadOpen(false)} onRefresh={props.onRefresh} />
      <LifeBalancePinModal open={lifePinOpen} onClose={() => setLifePinOpen(false)} />
      <QuickPortalAndDailyModal
        open={portalsOpen}
        onClose={() => setPortalsOpen(false)}
        todos={props.todos}
        notes={props.notes}
        sessions={props.sessions}
        exams={props.exams}
      />
      <TechFinanceLabModal open={techLabOpen} onClose={() => setTechLabOpen(false)} />
      <ExamPacerMeetingModal open={pacerOpen} onClose={() => setPacerOpen(false)} />
      <StickyNotesOverlay open={stickyOpen} onClose={() => setStickyOpen(false)} />
      <ProStudySuiteModal
        open={proSuiteOpen}
        onClose={() => setProSuiteOpen(false)}
        userName={props.user?.name ?? "KronoFlow"}
        todos={props.todos}
        grades={props.grades}
        sessions={props.sessions}
        flashcardCount={props.flashcards.length}
      />
      <MediaPlayerWidget open={mediaOpen} onToggleOpen={() => setMediaOpen((v) => !v)} />
      <LastMinuteCramModal
        open={cramOpen}
        notes={props.notes}
        mistakes={props.mistakes}
        onClose={() => setCramOpen(false)}
      />
      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onApplyTheme={(th) =>
          props.onApplyLocalTheme(th, props.wallpaper, props.customAccent, props.fontStyle, props.borderRadius)
        }
        onRefresh={props.onRefresh}
        onNotify={notify}
      />
      <QuickCaptureModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSuccess={(m) => {
          notify(m);
          props.onRefresh();
        }}
      />
      <div className={cn(
          "no-print fixed bottom-24 z-40 flex flex-col gap-2.5 lg:bottom-7",
          fabLeft ? "left-4 lg:left-7" : "right-4 lg:right-7"
        )}>
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            title="Lên đầu trang"
            className="flex h-10 w-10 items-center justify-center self-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-md hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          title="Trợ lý AI Copilot (Phím A)"
          className="btn-primary flex h-12 w-12 items-center justify-center rounded-full shadow-xl"
        >
          <Bot className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          title="Thêm nhanh (Phím Q)"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-lg hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* SIDEBAR 3 CHẾ ĐỘ: Đầy đủ (256px) -> Thu gọn icon (64px) -> Ẩn hoàn toàn (0px) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col justify-between bg-[var(--bg-surface)] transition-all duration-300 ease-out lg:flex",
          sidebarMode === "full"
            ? "w-64 border-r border-[var(--border-subtle)] p-4 opacity-100"
            : sidebarMode === "compact"
            ? "w-16 border-r border-[var(--border-subtle)] px-2 py-4 opacity-100 items-center"
            : "pointer-events-none w-0 overflow-hidden border-r-0 p-0 opacity-0"
        )}
      >
        <div className={sidebarMode === "full" ? "w-56" : "w-full"}>
          <div
            className={cn(
              "flex items-center py-1",
              sidebarMode === "full" ? "gap-3 px-1.5" : "justify-center"
            )}
          >
            <img
              src="/logo.png"
              alt="KronoFlow Logo"
              className="h-9 w-9 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-white object-contain p-0.5 shadow-sm"
            />
            {sidebarMode === "full" && (
              <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                KronoFlow
              </h1>
            )}
          </div>

          <nav className="mt-5 space-y-4">
            {sidebarMode === "full" && pinnedTabs.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                  <Pin className="h-3 w-3" /> Đã ghim
                </div>
                <div className="space-y-0.5">
                  {pinnedTabs.map((pid) => {
                    const item = NAV_DEF.find((n) => n.id === pid);
                    if (!item) return null;
                    const Icon = item.icon;
                    return (
                      <button
                        key={`pin-${item.id}`}
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
            )}

            {NAV_GROUPS.map((grp) => (
              <div key={grp.titleEn}>
                {sidebarMode === "full" && (
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) =>
                        prev.includes(grp.titleEn)
                          ? prev.filter((x) => x !== grp.titleEn)
                          : [...prev, grp.titleEn]
                      )
                    }
                    className="mb-1 flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <span>{lang === "vi" ? grp.titleVi : grp.titleEn}</span>
                    {collapsedGroups.includes(grp.titleEn) ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}
                {!(sidebarMode === "full" && collapsedGroups.includes(grp.titleEn)) && (
                <div className="space-y-0.5">
                  {grp.ids.map((id) => {
                    if (hiddenTabs.includes(id)) return null;
                    const item = NAV_DEF.find((n) => n.id === id);
                    if (!item) return null;
                    const Icon = item.icon;
                    const isPinned = pinnedTabs.includes(item.id);
                    return (
                      <div key={item.id} className="group flex items-center">
                        <button
                          type="button"
                          onClick={() => setTab(item.id)}
                          title={t(`nav_${item.id}`)}
                          className={cn(
                            "flex flex-1 items-center rounded-xl text-left text-[13px] font-medium",
                            sidebarMode === "full" ? "gap-2.5 px-3 py-2" : "justify-center p-2.5",
                            tab === item.id
                              ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {sidebarMode === "full" && (
                            <span className="flex flex-1 items-center justify-between gap-1 truncate">
                              <span className="truncate">{t(`nav_${item.id}`)}</span>
                              {item.id === "planner" && (() => {
                                const ov = props.todos.filter(
                                  (td) => !td.isCompleted && td.dueDate && td.dueDate.slice(0, 10) < todayIso
                                ).length;
                                return ov > 0 ? (
                                  <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-500">
                                    {ov}
                                  </span>
                                ) : null;
                              })()}
                              {item.id === "knowledge" && (() => {
                                const due = props.flashcards.filter(
                                  (fc) => !fc.nextReviewAt || new Date(fc.nextReviewAt).getTime() <= Date.now()
                                ).length;
                                return due > 0 ? (
                                  <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent)]">
                                    {due}
                                  </span>
                                ) : null;
                              })()}
                            </span>
                          )}
                        </button>
                        {sidebarMode === "full" && (
                          <button
                            type="button"
                            onClick={() => togglePinTab(item.id)}
                            title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                            className={cn(
                              "ml-0.5 rounded-lg p-1 text-[var(--text-muted)] transition-opacity hover:text-amber-500",
                              isPinned ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className={cn("border-t border-[var(--border-subtle)] pt-3", sidebarMode === "full" ? "w-56" : "w-full")}>
          {sidebarMode === "full" && (() => {
            const totalXp = props.sessions
              .filter((s) => s.status === "completed")
              .reduce((a, b) => a + b.actualMinutes, 0) * 2;
            const lv = Math.floor(totalXp / 250) + 1;
            const lvPct = Math.round(((totalXp % 250) / 250) * 100);
            return (
              <div className="mb-3 px-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Cấp {lv}</span>
                  <span className="font-mono">{totalXp % 250}/250 XP</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${lvPct}%` }} />
                </div>
              </div>
            );
          })()}
          <div className={cn("flex items-center text-xs text-[var(--text-muted)]", sidebarMode === "full" ? "justify-between px-1" : "flex-col gap-2")}>
            <span className="flex items-center gap-1.5" title={props.dbStatus === "connected" ? "PostgreSQL" : "Offline"}>
              <Database
                className={cn(
                  "h-3.5 w-3.5",
                  props.dbStatus === "connected" ? "text-emerald-500" : "text-rose-500"
                )}
              />
              {sidebarMode === "full" && (props.dbStatus === "connected" ? `PG · ${lastSyncedAt}` : "Offline")}
              {sidebarMode === "full" && (
                <button
                  type="button"
                  onClick={() => {
                    props.onRefresh();
                    setLastSyncedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
                    notify("Đã đồng bộ dữ liệu mới nhất từ PostgreSQL!");
                  }}
                  title="Tải lại dữ liệu từ PostgreSQL"
                  className="ml-1 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </span>
            <button
              type="button"
              onClick={handleSafeLogout}
              title={t("logout")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-rose-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              {sidebarMode === "full" && t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-10">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 py-3 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cycleSidebar}
              title="Đổi chế độ thanh bên: Đầy đủ → Thu gọn Icon → Ẩn (Phím B)"
              className="hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] lg:inline-flex"
            >
              {sidebarMode === "hidden" ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
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
            <div
              className={cn(
                "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
                toolbarCollapsed
                  ? "pointer-events-none max-w-0 scale-95 opacity-0"
                  : "max-w-[1150px] scale-100 opacity-100"
              )}
            >
            <button
              type="button"
              onClick={() => setPadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <NotebookPen className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Nháp</span>
            </button>
            <button
              type="button"
              onClick={() => setCheatOpen(true)}
              title="Kho công thức & đoạn mã tra nhanh"
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] md:inline-flex"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Công thức</span>
            </button>
            <button
              type="button"
              onClick={() => setCramOpen(true)}
              title="Chế độ Ôn gấp trước giờ thi 15 phút"
              className="hidden items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 xl:inline-flex"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Ôn gấp 15p</span>
            </button>
            {showExamPill && (() => {
              const nowT = Date.now();
              const nextEx = [...props.exams]
                .filter((ex) => new Date(ex.examDate).getTime() >= nowT - 86400000)
                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];
              if (!nextEx) return null;
              const days = Math.max(0, Math.ceil((new Date(nextEx.examDate).getTime() - nowT) / 86400000));
              return (
                <button
                  type="button"
                  onClick={() => setTab("dashboard")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowExamPill(false);
                  }}
                  title={`${nextEx.title} (${nextEx.examDate.slice(0, 10)}) — Nhấp phải để ẩn`}
                  className="hidden items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 2xl:inline-flex"
                >
                  <span className="max-w-[110px] truncate">{nextEx.title}</span>
                  <span className="font-mono font-bold">· {days === 0 ? "Hôm nay" : `${days}d`}</span>
                </button>
              );
            })()}
            <button
              type="button"
              onClick={() => setStandbyOpen(true)}
              title="Mở Đồng hồ để bàn chờ (Alt+S)"
              className="hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] xl:inline-flex"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMediaOpen((v) => !v)}
              title="Trình phát Nhạc tập trung (YouTube/TikTok/FB/IG & tệp máy tính)"
              className={`rounded-xl border p-1.5 transition ${
                mediaOpen
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              <Music2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSpotlightOpen(true)}
              title="Tìm kiếm toàn cục (Alt+K)"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDockOpen(true)}
              title="Kho Công cụ Học tập (Alt+T)"
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2 py-1.5 text-xs font-medium text-[var(--accent)] hover:opacity-90"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Công cụ</span>
            </button>
            <EyeCareToggle />
            <button
              type="button"
              onClick={cycleFontScale}
              title={`Chỉnh cỡ chữ toàn trang (Hiện tại: ${fontScale})`}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <span>Aa</span>
              <span className="hidden font-mono text-[10px] text-[var(--accent)] sm:inline">{fontScale}</span>
            </button>
            <button
              type="button"
              onClick={cycleWarm}
              title={`Lọc ánh sáng xanh êm mắt (${warmLevel}%)`}
              className={cn(
                "rounded-xl border p-1.5 text-xs transition-colors",
                warmLevel > 0
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-600"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
              )}
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPrivacyMode((v) => !v)}
              title="Chế độ riêng tư làm mờ điểm & tài chính (Phím P)"
              className={cn(
                "rounded-xl border p-1.5 text-xs transition-colors",
                privacyMode
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
              )}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !dndMode;
                setDndMode(next);
                localStorage.setItem("kronoflow-dnd", next ? "on" : "off");
                notify(next ? "Đã bật chế độ Im lặng (DND)" : "Đã tắt chế độ Im lặng");
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setFabLeft((v) => !v);
              }}
              title="Bật/Tắt Im lặng không làm phiền (Chuột phải để đổi góc nút nổi AI)"
              className={cn(
                "rounded-xl border p-1.5 text-xs transition-colors",
                dndMode
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-500"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
              )}
            >
              {dndMode ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
            <span
              title="Tiến độ mục tiêu tập trung hôm nay"
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--accent)] md:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 -rotate-90">
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke={headerGoalPct >= 100 ? "#10b981" : "var(--accent)"}
                  strokeWidth="3"
                  strokeDasharray={`${Math.round((headerGoalPct / 100) * 56.5)} 56.5`}
                  strokeLinecap="round"
                />
              </svg>
              {headerGoalPct}%
            </span>
            <LanguageToggle />
            </div>
            {toolbarCollapsed && (
              <button
                type="button"
                onClick={() => setDockOpen(true)}
                title="Kho Công cụ Học tập (Alt+T)"
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:opacity-90"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Công cụ</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const isDark = props.themeId !== "pure-white" && !props.themeId.includes("light") && !props.themeId.includes("paper") && !props.themeId.includes("latte") && !props.themeId.includes("mint") && !props.themeId.includes("rose") && !props.themeId.includes("sky") && !props.themeId.includes("sand");
                const nextTheme = isDark ? "pure-white" : "true-black";
                props.onApplyLocalTheme(nextTheme, props.wallpaper, props.customAccent, props.fontStyle, props.borderRadius);
                fetch("/api/user", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ theme: nextTheme }),
                }).catch(() => {});
              }}
              title="Chuyển nhanh Giao diện Sáng / Tối 1 chạm"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleToolbarCollapsed}
              title={toolbarCollapsed ? "Mở rộng thanh công cụ (Alt+H)" : "Thu gọn thanh công cụ (Alt+H)"}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <ChevronsRight
                className={cn(
                  "h-4 w-4 transition-transform duration-300 ease-in-out",
                  toolbarCollapsed ? "rotate-180" : "rotate-0"
                )}
              />
              <span className="hidden xl:inline">{toolbarCollapsed ? "Mở rộng" : "Thu gọn"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !toolbarCollapsed;
                setToolbarCollapsed(next);
                try {
                  localStorage.setItem("kronoflow-toolbar-collapsed", next ? "on" : "off");
                } catch {
                  // ignore
                }
                setSidebarMode(next ? "hidden" : "full");
              }}
              title="Chế độ Không gian Siêu Tối giản: thu gọn cả Sidebar & Header (Alt+Z)"
              className="hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] lg:inline-flex"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
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
              onClick={() => setHelpOpen(true)}
              title="Phím tắt (?)"
              className="hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--accent)] sm:inline-flex"
            >
              <HelpCircle className="h-4 w-4" />
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
              onClick={handleSafeLogout}
              className="rounded-xl border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] hover:text-rose-500 lg:hidden"
              title={t("logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {upcomingClass && (
          <div className="mx-auto mt-3 max-w-6xl px-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
              <span className="inline-flex items-center gap-2 font-medium">
                <BellRing className="h-4 w-4 shrink-0" />
                Sắp vào tiết lúc {upcomingClass.startTime}: <strong>{upcomingClass.title}</strong>
                {upcomingClass.location ? ` · Phòng ${upcomingClass.location}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setUpcomingClass(null)}
                className="text-[11px] underline opacity-80 hover:opacity-100"
              >
                Đã rõ
              </button>
            </div>
          </div>
        )}
        {bedtimeWarning && (
          <div className="mx-auto mt-3 max-w-6xl px-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-700 dark:text-indigo-300">
              <span className="inline-flex items-center gap-2 font-medium">
                <MoonStar className="h-4 w-4 shrink-0" />
                {bedtimeWarning}
              </span>
              <button
                type="button"
                onClick={() => setBedtimeWarning(null)}
                className="text-[11px] underline opacity-80"
              >
                Ẩn
              </button>
            </div>
          </div>
        )}
        {isOffline && (
          <div className="mx-auto mt-3 max-w-6xl px-4 sm:px-8">
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              <WifiOff className="h-4 w-4 shrink-0" />
              Bạn đang ngoại tuyến — các thao tác lưu lên PostgreSQL sẽ tự đồng bộ lại ngay khi có mạng.
            </div>
          </div>
        )}
        <main key={tab} className={cn("animate-tab-in mx-auto px-4 py-6 sm:px-8", wideLayout ? "max-w-[1440px]" : "max-w-6xl")}>
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
              notes={props.notes}
              resources={props.resources}
              slots={props.slots}
              onOpenWeeklyReview={() => setReviewOpen(true)}
              onResumeTab={(id) => setTab(id as TabId)}
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
              notes={props.notes}
              flashcards={props.flashcards}
              exams={props.exams}
              onFocusTask={(title) => {
                setFocusedTaskTitle(title);
                setTab("focus");
              }}
              onUndoableDelete={notifyUndoable}
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
              books={props.books}
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
              mistakes={props.mistakes}
              onUndoableDelete={notifyUndoable}
              onFocusNote={(title) => {
                setFocusedTaskTitle(title);
                setTab("focus");
              }}
              onRefresh={props.onRefresh}
            />
          )}
          {tab === "expenses" && (
            <div className="privacy-sensitive">
            <ExpensesPanel
              expenses={props.expenses}
              totalStudyHours={
                props.sessions
                  .filter((s) => s.status === "completed")
                  .reduce((a, b) => a + b.actualMinutes, 0) / 60
              }
              onNotify={notify}
              onRefresh={props.onRefresh}
            />
            </div>
          )}
          {tab === "analytics" && (
            <AnalyticsPanel
              sessions={props.sessions}
              subjects={props.subjects}
              totalHabits={props.habits.length}
              totalCards={props.flashcards.length}
              todos={props.todos}
            />
          )}
          {tab === "settings" && (
            <StudioSettingsPanel
              user={props.user}
              onApplyLocalTheme={props.onApplyLocalTheme}
              onApplyLocalAvatar={props.onApplyLocalAvatar}
              onExportBackup={handleExportBackup}
              onOpenOnboarding={() => setOnboardingOpen(true)}
              onRefresh={props.onRefresh}
            />
          )}
        </main>
        {showHints && (
          <div className="no-print mx-auto mt-2 hidden max-w-6xl items-center justify-between px-8 pb-4 text-[11px] text-[var(--text-muted)] lg:flex">
            <span>
              Phím tắt nhanh:{" "}
              {tab === "focus"
                ? "Space (Chạy/Dừng) · R (Đặt lại) · A (AI Copilot)"
                : tab === "knowledge"
                ? "Ctrl+Enter (Lưu ghi chú) · Ctrl+K (Tìm nhanh) · N (Nháp)"
                : "Ctrl+K (Bảng lệnh) · Q (Thêm nhanh) · P (Làm mờ riêng tư) · Alt+1..9 (Chuyển tab)"}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowHints(false);
                localStorage.setItem("kronoflow-hide-hints", "1");
              }}
              className="hover:text-[var(--text-primary)]"
            >
              Ẩn gợi ý
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="animate-pop fixed bottom-20 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-xl lg:bottom-6">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{toast.msg}</span>
          {toast.onUndo && (
            <button
              type="button"
              onClick={async () => {
                const fn = toast.onUndo;
                setToast(null);
                if (fn) {
                  await fn();
                  notify("Đã hoàn tác khôi phục dữ liệu!");
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
            >
              <Undo2 className="h-3 w-3" /> Hoàn tác
            </button>
          )}
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
              onKeyDown={async (e) => {
                if (e.key === "Enter" && cmdQuery.trim().startsWith(">")) {
                  const cmd = cmdQuery.trim().slice(1).trim();
                  const lower = cmd.toLowerCase();
                  if (lower.startsWith("todo ") && cmd.slice(5).trim()) {
                    await fetch("/api/todos", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: cmd.slice(5).trim(), priority: "medium" }),
                    });
                    notify(`Đã thêm việc: ${cmd.slice(5).trim()}`);
                    props.onRefresh();
                  } else if (lower.startsWith("theme dark")) {
                    props.onApplyLocalTheme("nord-slate", props.wallpaper, props.customAccent, props.fontStyle, props.borderRadius);
                    notify("Đã chuyển sang chủ đề Tối (Nord Slate)");
                  } else if (lower.startsWith("theme light")) {
                    props.onApplyLocalTheme("pure-white", props.wallpaper, props.customAccent, props.fontStyle, props.borderRadius);
                    notify("Đã chuyển sang chủ đề Sáng (Pure White)");
                  } else if (lower.startsWith("pomodoro") || lower.startsWith("focus")) {
                    setTab("focus");
                  } else if (lower.startsWith("backup")) {
                    handleExportBackup();
                  } else if (lower.startsWith("review")) {
                    setReviewOpen(true);
                  } else if (lower.startsWith("ai")) {
                    setAiOpen(true);
                  } else if (lower.startsWith("cheat")) {
                    setCheatOpen(true);
                  } else if (lower.startsWith("privacy")) {
                    setPrivacyMode((v) => !v);
                  }
                  setCmdOpen(false);
                  setCmdQuery("");
                }
              }}
              placeholder="Tìm nhanh hoặc gõ lệnh: > todo ..., > theme dark, > review, > backup"
              className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setTab("focus");
                  setCmdOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Terminal className="h-3 w-3" /> &gt; Pomodoro 25p
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewOpen(true);
                  setCmdOpen(false);
                }}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                &gt; Tổng kết tuần
              </button>
              <button
                type="button"
                onClick={() => {
                  props.onApplyLocalTheme(
                    props.themeId === "pure-white" ? "nord-slate" : "pure-white",
                    props.wallpaper,
                    props.customAccent,
                    props.fontStyle,
                    props.borderRadius
                  );
                  setCmdOpen(false);
                }}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                &gt; Đổi Sáng/Tối
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportBackup();
                  setCmdOpen(false);
                }}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                &gt; Sao lưu JSON
              </button>
            </div>
            <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
              {cmdQuery.trim().length > 0 && (
                <>
                  {props.todos
                    .filter((x) => normalizeVi(x.title).includes(normalizeVi(cmdQuery)))
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
                    .filter((x) => normalizeVi(x.title).includes(normalizeVi(cmdQuery)))
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
                  {props.subjects
                    .filter((x) => normalizeVi(x.name).includes(normalizeVi(cmdQuery)))
                    .slice(0, 3)
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
                        <span className="truncate">📚 {x.name}</span>
                        <span className="text-[10px] text-[var(--accent)]">Môn học</span>
                      </button>
                    ))}
                  {props.exams
                    .filter((x) => normalizeVi(x.title).includes(normalizeVi(cmdQuery)))
                    .slice(0, 3)
                    .map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          setTab("dashboard");
                          setCmdOpen(false);
                          setCmdQuery("");
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      >
                        <span className="truncate">⏳ {x.title} ({x.examDate.slice(0, 10)})</span>
                        <span className="text-[10px] text-amber-500">Kỳ thi</span>
                      </button>
                    ))}
                  {props.mistakes
                    .filter((x) => normalizeVi(x.question).includes(normalizeVi(cmdQuery)))
                    .slice(0, 3)
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
                        <span className="truncate">⚠ {x.question}</span>
                        <span className="text-[10px] text-rose-500">Sổ Lỗi Sai</span>
                      </button>
                    ))}
                  {(() => {
                    try {
                      const raw = localStorage.getItem("kronoflow-cheatsheets");
                      const arr = raw ? (JSON.parse(raw) as { id: string; title: string; body: string }[]) : [];
                      return arr
                        .filter(
                          (c) =>
                            c.title.toLowerCase().includes(cmdQuery.toLowerCase()) ||
                            c.body.toLowerCase().includes(cmdQuery.toLowerCase())
                        )
                        .slice(0, 3)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(c.body).catch(() => {});
                              notify(`Đã chép nhanh: ${c.title}`);
                              setCmdOpen(false);
                              setCmdQuery("");
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                          >
                            <span className="truncate">📋 {c.title}</span>
                            <span className="text-[10px] text-emerald-500">Chép công thức</span>
                          </button>
                        ));
                    } catch {
                      return null;
                    }
                  })()}
                </>
              )}
              {NAV_DEF.filter((item) =>
                normalizeVi(t(`nav_${item.id}`)).includes(normalizeVi(cmdQuery))
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
            <div className="mt-3 flex flex-wrap items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-[10px] text-[var(--text-muted)]">
              <span>
                {props.todos.filter((t) => !t.isCompleted).length} việc chưa xong ·{" "}
                {props.flashcards.filter((c) => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= Date.now()).length} thẻ cần ôn ·{" "}
                {props.exams.length} kỳ thi
              </span>
              <span>Alt+F: Tìm nhanh</span>
            </div>
          </div>
        </div>
      )}

      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="animate-tab-in w-full rounded-t-2xl border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
              <span>Tất cả không gian</span>
              <button type="button" onClick={() => setMobileMoreOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV_DEF.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setMobileMoreOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] font-medium",
                      tab === item.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{t(`nav_${item.id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:hidden">
        {(["dashboard", "focus", "schedule", "planner"] as TabId[]).map((id) => {
          const item = NAV_DEF.find((n) => n.id === id)!;
          const Icon = item.icon;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                tab === id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`nav_${id}`)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-[var(--text-muted)]"
        >
          <Sliders className="h-4 w-4" />
          Mở rộng
        </button>
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
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
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
        const u: ExtendedUserProfile | null = (await uRes.json()).data;
        if (!u) {
          setAuthState("guest");
          return;
        }
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
        bkRes,
        mkRes,
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
        fetch("/api/books"),
        fetch("/api/mistakes"),
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
      if (bkRes.ok) setBooks((await bkRes.json()).data ?? []);
      if (mkRes.ok) setMistakes((await mkRes.json()).data ?? []);
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
      <div className="mx-auto min-h-screen max-w-6xl space-y-6 p-6 sm:p-10">
        <div className="h-12 w-48 animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
          ))}
        </div>
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
        books={books}
        mistakes={mistakes}
        dbStatus={dbStatus}
        themeId={themeId}
        customAccent={customAccent}
        fontStyle={fontStyle}
        borderRadius={borderRadius}
        wallpaper={wallpaper}
        onApplyLocalAvatar={(url) => {
          setUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
        }}
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
