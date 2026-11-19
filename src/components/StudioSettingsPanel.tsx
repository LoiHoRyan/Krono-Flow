"use client";

import { useState } from "react";
import { Bell, Download, Palette, Save, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEMES, WALLPAPERS } from "@/lib/themes";
import type { UserProfile } from "./DashboardBento";

export function StudioSettingsPanel({
  user,
  onApplyLocalTheme,
  onExportBackup,
  onRefresh,
}: {
  user: UserProfile | null;
  onApplyLocalTheme: (themeId: string, wallpaper: string) => void;
  onExportBackup: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState(user?.name ?? "KronoFlow Learner");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoalMinutes ?? 120);
  const [customUrl, setCustomUrl] = useState(
    user?.wallpaper?.startsWith("http") ? user.wallpaper : ""
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, dailyGoalMinutes: dailyGoal }),
    });
    if (res.ok) {
      setSavedMsg("Đã lưu hồ sơ vào PostgreSQL!");
      onRefresh();
      setTimeout(() => setSavedMsg(null), 2500);
    }
  };

  const selectTheme = async (themeId: string) => {
    onApplyLocalTheme(themeId, user?.wallpaper ?? "mesh-aurora");
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId }),
    });
    onRefresh();
  };

  const selectWallpaper = async (wp: string) => {
    onApplyLocalTheme(user?.theme ?? "aurora", wp);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallpaper: wp }),
    });
    onRefresh();
  };

  const requestNotif = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="glass-card space-y-6 rounded-2xl p-6 lg:col-span-7">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              6 Bộ Giao Diện (Multi-Theme Studio)
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Tự động lưu vĩnh viễn vào PostgreSQL theo tài khoản của bạn
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = (user?.theme ?? "aurora") === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTheme(t.id)}
                  className={cn(
                    "overflow-hidden rounded-2xl border p-2 text-left transition",
                    active
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40"
                      : "border-[var(--border-subtle)] hover:border-[var(--accent)]/60"
                  )}
                >
                  <div
                    className="h-14 w-full rounded-xl"
                    style={{ background: t.preview }}
                  />
                  <div className="mt-2 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {t.name}
                    </span>
                    <span className="text-[10px] uppercase text-[var(--text-muted)]">
                      {t.mode}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Hình nền Không gian (Wallpaper)
            </h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WALLPAPERS.map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => selectWallpaper(wp.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium transition",
                  (user?.wallpaper ?? "mesh-aurora") === wp.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                )}
              >
                {wp.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Hoặc dán URL ảnh nền riêng (https://...)"
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => customUrl.trim() && selectWallpaper(customUrl.trim())}
              className="rounded-xl bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-6 lg:col-span-5">
        <form onSubmit={saveProfile} className="glass-card space-y-3 rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Hồ sơ & Mục tiêu cá nhân
            </h3>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Tên hiển thị</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Khẩu hiệu động lực</label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">Mục tiêu mỗi ngày (phút)</label>
            <input
              type="number"
              min={15}
              max={720}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            className="accent-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
          >
            <Save className="h-3.5 w-3.5" />
            Lưu thay đổi
          </button>
          {savedMsg && <p className="text-xs text-emerald-400">{savedMsg}</p>}
        </form>

        <section className="glass-card space-y-3 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Thông báo & Sao lưu
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestNotif}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              Thông báo trình duyệt: {notifStatus}
            </button>
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Xuất bản sao lưu JSON
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
