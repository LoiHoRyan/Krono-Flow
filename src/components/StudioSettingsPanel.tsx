"use client";

import { useState } from "react";
import { Bell, Download, Palette, RotateCcw, Save, Sparkles, Type, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { FONT_STYLES, THEMES, WALLPAPERS } from "@/lib/themes";
import type { UserProfile } from "./DashboardBento";

export interface ExtendedUserProfile extends UserProfile {
  customAccent?: string | null;
  fontStyle?: string | null;
}

export function StudioSettingsPanel({
  user,
  onApplyLocalTheme,
  onExportBackup,
  onRefresh,
}: {
  user: ExtendedUserProfile | null;
  onApplyLocalTheme: (themeId: string, wallpaper: string, customAccent: string | null, fontStyle: string) => void;
  onExportBackup: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoalMinutes ?? 120);
  const [customAccent, setCustomAccent] = useState(user?.customAccent ?? "");
  const [fontStyle, setFontStyle] = useState(user?.fontStyle ?? "sans");
  const [customUrl, setCustomUrl] = useState(
    user?.wallpaper?.startsWith("http") ? user.wallpaper : ""
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  const curTheme = user?.theme ?? "ivory";
  const curWp = user?.wallpaper ?? "none";

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
    setCustomAccent("");
    onApplyLocalTheme(themeId, curWp, null, fontStyle);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId, customAccent: null }),
    });
    onRefresh();
  };

  const selectAccent = async (hex: string | null) => {
    setCustomAccent(hex ?? "");
    onApplyLocalTheme(curTheme, curWp, hex, fontStyle);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customAccent: hex }),
    });
    onRefresh();
  };

  const selectFont = async (nextFont: string) => {
    setFontStyle(nextFont);
    onApplyLocalTheme(curTheme, curWp, customAccent || null, nextFont);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fontStyle: nextFont }),
    });
    onRefresh();
  };

  const selectWallpaper = async (wp: string) => {
    onApplyLocalTheme(curTheme, wp, customAccent || null, fontStyle);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallpaper: wp }),
    });
    onRefresh();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg("Đang khôi phục...");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const out = await res.json();
      if (res.ok) {
        setRestoreMsg(`Đã khôi phục ${out.restored} mục vào PostgreSQL!`);
        onRefresh();
      } else {
        setRestoreMsg(out.error ?? "Tệp JSON không hợp lệ");
      }
    } catch {
      setRestoreMsg("Lỗi đọc tệp JSON");
    }
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
              8 Bảng Màu Toàn Diện (Sáng & Tối)
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Đổi đồng bộ nền chính, nền thẻ, viền, chữ và màu điểm nhấn — lưu vĩnh viễn trong PostgreSQL
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {THEMES.map((t) => {
              const active = curTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTheme(t.id)}
                  className={cn(
                    "overflow-hidden rounded-xl border p-2 text-left transition",
                    active
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/35"
                      : "border-[var(--border-subtle)] hover:border-[var(--accent)]/60"
                  )}
                >
                  <div
                    className="flex h-12 items-end justify-between rounded-lg border p-2"
                    style={{ backgroundColor: t.canvas, borderColor: t.border }}
                  >
                    <span
                      className="h-5 w-8 rounded border"
                      style={{ backgroundColor: t.surface, borderColor: t.border }}
                    />
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: t.accent }}
                    />
                  </div>
                  <div className="mt-2 truncate text-xs font-medium text-[var(--text-primary)]">
                    {t.name}
                  </div>
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">{t.mode}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Accent & Font */}
        <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Tự chọn màu điểm nhấn (Custom Accent)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={customAccent || "#2563eb"}
                onChange={(e) => selectAccent(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-transparent p-0.5"
              />
              <button
                type="button"
                onClick={() => selectAccent(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <RotateCcw className="h-3 w-3" />
                Mặc định theme
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Type className="h-3.5 w-3.5 text-[var(--accent)]" />
              Phông chữ hiển thị
            </label>
            <select
              value={fontStyle}
              onChange={(e) => selectFont(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            >
              {FONT_STYLES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Họa tiết & Hình nền</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WALLPAPERS.map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => selectWallpaper(wp.id)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
                  curWp === wp.id
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
              className="rounded-xl bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white"
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Hồ sơ & Mục tiêu</h3>
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
            <label className="text-xs text-[var(--text-muted)]">Khẩu hiệu</label>
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
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white"
          >
            <Save className="h-3.5 w-3.5" />
            Lưu thay đổi
          </button>
          {savedMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{savedMsg}</p>}
        </form>

        <section className="glass-card space-y-3 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Thông báo & Sao lưu / Khôi phục
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestNotif}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
            >
              <Bell className="h-3.5 w-3.5 text-amber-500" />
              Thông báo: {notifStatus}
            </button>
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5 text-emerald-500" />
              Xuất JSON
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)]">
              <Upload className="h-3.5 w-3.5 text-[var(--accent)]" />
              Khôi phục JSON
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
          {restoreMsg && <p className="text-xs text-[var(--accent)]">{restoreMsg}</p>}
        </section>
      </div>
    </div>
  );
}
