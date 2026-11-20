"use client";

import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageToggle, useLang } from "@/lib/i18n";

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const { lang, t } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? (lang === "vi" ? "Có lỗi xảy ra." : "Something went wrong."));
        return;
      }
      onSuccess();
    } catch {
      setError(lang === "vi" ? "Không thể kết nối máy chủ." : "Cannot reach server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      if (res.ok) onSuccess();
      else setError(lang === "vi" ? "Chưa kết nối được PostgreSQL." : "PostgreSQL not connected.");
    } finally {
      setLoading(false);
    }
  };

  const highlights =
    lang === "vi"
      ? [
          "Pomodoro chạy nền & 4 âm thanh tập trung",
          "Thời khóa biểu tuần, Sổ điểm GPA & Habit Tracker",
          "Lộ trình học động, Ghi chú & Flashcards 3D SM-2",
          "8 bảng màu dịu mắt & song ngữ VI / EN",
        ]
      : [
          "Background Pomodoro Worker & 4 Ambient Sounds",
          "Weekly Timetable, GPA Gradebook & Habit Tracker",
          "Dynamic Roadmaps, Notes & 3D SM-2 Flashcards",
          "8 Curated Full-Palette Themes & VI / EN switch",
        ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 py-10">
      <div className="glass-card animate-tab-in grid w-full max-w-4xl overflow-hidden rounded-2xl lg:grid-cols-12">
        <div className="flex flex-col justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="btn-primary inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold">
                  KF
                </span>
                <span className="text-base font-semibold text-[var(--text-primary)]">
                  KronoFlow
                </span>
              </div>
              <LanguageToggle />
            </div>

            <h1 className="mt-6 text-xl font-semibold leading-snug text-[var(--text-primary)]">
              {t("appTagline")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {lang === "vi"
                ? "Tập trung sâu với Pomodoro, sắp xếp thời khóa biểu, theo dõi GPA và lưu trữ lộ trình trên PostgreSQL."
                : "Deep focus sessions, structured timetables, GPA tracking, and study roadmaps backed by PostgreSQL."}
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-[var(--text-secondary)]">
              {highlights.map((feat) => (
                <li key={feat} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-[11px] text-[var(--text-muted)]">
            {lang === "vi"
              ? "Dữ liệu tài khoản được bảo mật và lưu trữ riêng biệt trên PostgreSQL."
              : "Account data is securely isolated and persisted in PostgreSQL."}
          </p>
        </div>

        <div className="p-8 lg:col-span-7">
          <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 font-medium",
                mode === "login"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)]"
              )}
            >
              {t("authLogin")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 font-medium",
                mode === "register"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)]"
              )}
            >
              {t("authRegister")}
            </button>
          </div>

          <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
            {mode === "login" ? t("authWelcome") : t("authCreateTitle")}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {mode === "login" ? t("authWelcomeSub") : t("authCreateSub")}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  {t("authName")}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === "vi" ? "Nguyễn Văn An" : "Alex Morgan"}
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                {t("authEmail")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                {t("authPassword")}
              </label>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 pr-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "..." : mode === "login" ? t("authLogin") : t("authRegister")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span>{t("authOr")}</span>
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleDemo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            {t("authDemo")}
          </button>
        </div>
      </div>
    </div>
  );
}
