"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "vi" | "en";

const DICT: Record<Lang, Record<string, string>> = {
  vi: {
    appTagline: "Không gian học tập & quản lý thời gian",
    nav_dashboard: "Tổng quan",
    nav_dashboard_desc: "Lịch tháng, KPI & Kỳ thi",
    nav_focus: "Phòng Tập Trung",
    nav_focus_desc: "Pomodoro chạy nền & Âm thanh",
    nav_schedule: "Lịch & Sổ điểm",
    nav_schedule_desc: "Thời khóa biểu & Tính GPA",
    nav_planner: "Môn học & Việc",
    nav_planner_desc: "Danh sách, Kanban & Ma trận Eisenhower",
    nav_habits: "Thói quen & Kho",
    nav_habits_desc: "Habit Tracker, Tài liệu & Nhật ký",
    nav_roadmaps: "Kho Lộ Trình",
    nav_roadmaps_desc: "8 lộ trình mẫu & tự tạo",
    nav_knowledge: "Ghi chú & Thẻ",
    nav_knowledge_desc: "Notes & Flashcards 3D SM-2",
    nav_analytics: "Thống kê",
    nav_analytics_desc: "Heatmap, Biểu đồ & Huy hiệu",
    nav_settings: "Giao diện & Hồ sơ",
    nav_settings_desc: "8 Bảng màu, Font & Sao lưu",
    quickJump: "Chuyển nhanh",
    logout: "Đăng xuất",
    loadingSpace: "Đang tải không gian KronoFlow...",
    authLogin: "Đăng nhập",
    authRegister: "Đăng ký tài khoản",
    authWelcome: "Chào mừng trở lại",
    authCreateTitle: "Tạo tài khoản mới",
    authWelcomeSub: "Đăng nhập để tiếp tục không gian học tập của bạn.",
    authCreateSub: "Bắt đầu lưu trữ dữ liệu học tập đồng bộ trên PostgreSQL.",
    authName: "Họ và tên",
    authEmail: "Email",
    authPassword: "Mật khẩu",
    authDemo: "Vào nhanh bằng tài khoản Demo (1 click)",
    authOr: "HOẶC",
    achievementsTitle: "Bảng Huy hiệu Thành tựu",
    achievementsSub: "Tự động mở khóa dựa trên dữ liệu học tập thật từ PostgreSQL",
    unlocked: "Đã mở khóa",
    locked: "Chưa mở",
    collapseSidebar: "Thu gọn thanh bên",
    expandSidebar: "Mở rộng thanh bên",
  },
  en: {
    appTagline: "Deep Focus & Study Workspace",
    nav_dashboard: "Overview",
    nav_dashboard_desc: "Monthly calendar, KPIs & Exams",
    nav_focus: "Focus Studio",
    nav_focus_desc: "Background Pomodoro & Ambient Audio",
    nav_schedule: "Schedule & GPA",
    nav_schedule_desc: "Weekly Timetable & Gradebook",
    nav_planner: "Subjects & Tasks",
    nav_planner_desc: "List, Kanban & Eisenhower Matrix",
    nav_habits: "Habits & Vault",
    nav_habits_desc: "Habit Tracker, Resources & Journal",
    nav_roadmaps: "Roadmaps",
    nav_roadmaps_desc: "8 Prebuilt & Custom Roadmaps",
    nav_knowledge: "Notes & Cards",
    nav_knowledge_desc: "Study Notes & 3D SM-2 Flashcards",
    nav_analytics: "Analytics",
    nav_analytics_desc: "Heatmap, Charts & Achievements",
    nav_settings: "Appearance & Profile",
    nav_settings_desc: "8 Themes, Fonts & Backup",
    quickJump: "Quick Jump",
    logout: "Sign out",
    loadingSpace: "Loading KronoFlow workspace...",
    authLogin: "Sign in",
    authRegister: "Create account",
    authWelcome: "Welcome back",
    authCreateTitle: "Create a new account",
    authWelcomeSub: "Sign in to continue your study workflow.",
    authCreateSub: "Sync your study data securely on PostgreSQL.",
    authName: "Full name",
    authEmail: "Email",
    authPassword: "Password",
    authDemo: "Instant Demo Sign-in (1 click)",
    authOr: "OR",
    achievementsTitle: "Achievement Badges",
    achievementsSub: "Automatically unlocked from your real PostgreSQL study progress",
    unlocked: "Unlocked",
    locked: "Locked",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
  },
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    const saved = localStorage.getItem("kronoflow-lang");
    if (saved === "en" || saved === "vi") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("kronoflow-lang", l);
  };

  const toggleLang = () => setLang(lang === "vi" ? "en" : "vi");

  const t = (key: string) => DICT[lang][key] ?? DICT.vi[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

export function FlagVI({ className = "h-3.5 w-5 rounded-[2px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
      <rect width="30" height="20" fill="#da251d" />
      <polygon
        points="15,4 16.47,8.52 21.22,8.52 17.38,11.31 18.85,15.83 15,13.04 11.15,15.83 12.62,11.31 8.78,8.52 13.53,8.52"
        fill="#ffff00"
      />
    </svg>
  );
}

export function FlagEN({ className = "h-3.5 w-5 rounded-[2px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#ffffff" strokeWidth="3.6" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#c8102e" strokeWidth="1.8" />
      <path d="M15,0 V20 M0,10 H30" stroke="#ffffff" strokeWidth="5.4" />
      <path d="M15,0 V20 M0,10 H30" stroke="#c8102e" strokeWidth="3" />
    </svg>
  );
}

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      className="inline-flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5 text-[11px] font-semibold"
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => setLang("vi")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ${
          lang === "vi"
            ? "bg-[var(--accent)] text-white shadow-sm"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        <FlagVI />
        <span>VI</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ${
          lang === "en"
            ? "bg-[var(--accent)] text-white shadow-sm"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        <FlagEN />
        <span>EN</span>
      </button>
    </div>
  );
}
