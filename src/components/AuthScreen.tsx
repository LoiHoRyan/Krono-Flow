"use client";

import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
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
      const payload =
        mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Có lỗi xảy ra, vui lòng kiểm tra lại.");
        return;
      }
      onSuccess();
    } catch {
      setError("Không thể kết nối máy chủ.");
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
      else setError("Chưa kết nối được PostgreSQL. Hãy kiểm tra Docker/DATABASE_URL.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm lg:grid-cols-12">
        {/* Cột giới thiệu bên trái */}
        <div className="flex flex-col justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
                KF
              </span>
              <span className="text-base font-semibold text-[var(--text-primary)]">
                KronoFlow
              </span>
            </div>

            <h1 className="mt-6 text-xl font-semibold leading-snug text-[var(--text-primary)]">
              Không gian quản lý thời gian & học tập toàn diện
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Tập trung sâu với Pomodoro, sắp xếp thời khóa biểu, theo dõi GPA và lưu trữ lộ trình trên PostgreSQL.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-[var(--text-secondary)]">
              {[
                "Pomodoro Web Worker & 4 âm thanh nền",
                "Thời khóa biểu tuần & Sổ điểm tính GPA",
                "Lộ trình học động, Ghi chú & Flashcards",
                "Lịch học tháng, Streak Freeze & Heatmap",
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-[11px] text-[var(--text-muted)]">
            Dữ liệu tài khoản được bảo mật và lưu trữ riêng biệt trong PostgreSQL.
          </p>
        </div>

        {/* Cột biểu mẫu bên phải */}
        <div className="p-8 lg:col-span-7">
          <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 font-medium transition",
                mode === "login"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)]"
              )}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={cn(
                "rounded-lg px-4 py-1.5 font-medium transition",
                mode === "register"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)]"
              )}
            >
              Đăng ký tài khoản
            </button>
          </div>

          <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
            {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {mode === "login"
              ? "Đăng nhập để tiếp tục không gian học tập của bạn."
              : "Bắt đầu lưu trữ dữ liệu học tập đồng bộ trên PostgreSQL."}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn An"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Email</label>
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
              <label className="text-xs font-medium text-[var(--text-secondary)]">Mật khẩu</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {loading
                ? "Đang xử lý..."
                : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span>HOẶC</span>
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleDemo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            Vào nhanh bằng tài khoản Demo (1 click)
          </button>
        </div>
      </div>
    </div>
  );
}
