"use client";

import { useState } from "react";
import {
  Bell,
  Camera,
  Download,
  KeyRound,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Type,
  Upload,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_STYLES,
  PRESET_AVATARS,
  RADIUS_PRESETS,
  THEMES,
  WALLPAPERS,
} from "@/lib/themes";
import type { UserProfile } from "./DashboardBento";

export interface ExtendedUserProfile extends UserProfile {
  customAccent?: string | null;
  fontStyle?: string | null;
  avatarUrl?: string | null;
  borderRadius?: string | null;
}

export function StudioSettingsPanel({
  user,
  onApplyLocalTheme,
  onExportBackup,
  onRefresh,
}: {
  user: ExtendedUserProfile | null;
  onApplyLocalTheme: (
    themeId: string,
    wallpaper: string,
    customAccent: string | null,
    fontStyle: string,
    borderRadius: string
  ) => void;
  onExportBackup: () => void;
  onRefresh: () => void;
}) {
  const [themeTab, setThemeTab] = useState<"light" | "dark">("light");
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoalMinutes ?? 120);
  const [customAccent, setCustomAccent] = useState(user?.customAccent ?? "");
  const [fontStyle, setFontStyle] = useState(user?.fontStyle ?? "editorial");
  const [borderRadius, setBorderRadius] = useState(user?.borderRadius ?? "normal");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [customUrl, setCustomUrl] = useState(
    user?.wallpaper?.startsWith("http") ? user.wallpaper : ""
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [compactUi, setCompactUi] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("compact-ui")
  );
  const [seeding, setSeeding] = useState(false);

  const toggleDensity = () => {
    const next = !compactUi;
    setCompactUi(next);
    document.documentElement.classList.toggle("compact-ui", next);
    localStorage.setItem("kronoflow-density", next ? "compact" : "comfortable");
  };

  const handleSeedSample = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        setRestoreMsg("Đã nạp bộ dữ liệu mẫu thành công vào PostgreSQL!");
        onRefresh();
      }
    } finally {
      setSeeding(false);
    }
  };

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [notifStatus, setNotifStatus] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  const curTheme = user?.theme ?? "pure-white";
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

  const updateAvatar = async (url: string | null) => {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    });
    setSavedMsg("Đã cập nhật ảnh đại diện!");
    onRefresh();
    setTimeout(() => setSavedMsg(null), 2200);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        updateAvatar(dataUrl);
      };
      if (typeof reader.result === "string") img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const selectTheme = async (themeId: string) => {
    setCustomAccent("");
    onApplyLocalTheme(themeId, curWp, null, fontStyle, borderRadius);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId, customAccent: null }),
    });
    onRefresh();
  };

  const selectAccent = async (hex: string | null) => {
    setCustomAccent(hex ?? "");
    onApplyLocalTheme(curTheme, curWp, hex, fontStyle, borderRadius);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customAccent: hex }),
    });
    onRefresh();
  };

  const selectFont = async (nextFont: string) => {
    setFontStyle(nextFont);
    onApplyLocalTheme(curTheme, curWp, customAccent || null, nextFont, borderRadius);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fontStyle: nextFont }),
    });
    onRefresh();
  };

  const selectRadius = async (nextRad: string) => {
    setBorderRadius(nextRad);
    onApplyLocalTheme(curTheme, curWp, customAccent || null, fontStyle, nextRad);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ borderRadius: nextRad }),
    });
    onRefresh();
  };

  const selectWallpaper = async (wp: string) => {
    onApplyLocalTheme(curTheme, wp, customAccent || null, fontStyle, borderRadius);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallpaper: wp }),
    });
    onRefresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setPwMsg("Đổi mật khẩu thành công!");
    } else {
      setPwMsg(json.error ?? "Không thể đổi mật khẩu");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg("Đang khôi phục...");
    try {
      const json = JSON.parse(await file.text());
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

  const visibleThemes = THEMES.filter((t) => t.mode === themeTab);

  return (
    <div className="space-y-6">
      {/* AVATAR STUDIO */}
      <section className="glass-card card-lift p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-[var(--accent)] bg-[var(--bg-elevated)]">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--accent)]">
                  {(user?.name ?? "KF").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-[var(--text-primary)]">
                Ảnh đại diện (Avatar Studio)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Tải ảnh từ máy tính, dán URL hoặc chọn 1 trong 12 biểu tượng bên dưới
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-primary inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium">
              <Camera className="h-3.5 w-3.5" />
              Tải ảnh từ máy
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
            {user?.avatarUrl && (
              <button
                type="button"
                onClick={() => updateAvatar(null)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-rose-500"
              >
                Xóa ảnh
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_AVATARS.map((av) => (
            <button
              key={av.id}
              type="button"
              onClick={() => updateAvatar(av.url)}
              title={av.label}
              className={cn(
                "h-11 w-11 overflow-hidden rounded-full border-2 p-0.5",
                user?.avatarUrl === av.url
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                  : "border-transparent hover:border-[var(--border-subtle)]"
              )}
            >
              <img src={av.url} alt={av.label} className="h-full w-full rounded-full" />
            </button>
          ))}
        </div>

        <div className="mt-3 flex max-w-md gap-2">
          <input
            type="url"
            value={avatarUrlInput}
            onChange={(e) => setAvatarUrlInput(e.target.value)}
            placeholder="Hoặc dán URL ảnh đại diện (https://...)"
            className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => {
              if (avatarUrlInput.trim()) {
                updateAvatar(avatarUrlInput.trim());
                setAvatarUrlInput("");
              }
            }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
          >
            Dùng URL
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 16 FULL-PALETTE THEMES */}
        <section className="glass-card card-lift space-y-6 p-6 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-base font-medium text-[var(--text-primary)]">
                  16 Bảng Màu Giao Diện (8 Sáng · 8 Tối)
                </h3>
              </div>
              <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setThemeTab("light")}
                  className={cn(
                    "rounded-lg px-3 py-1 font-medium",
                    themeTab === "light"
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  Chế độ Sáng (8)
                </button>
                <button
                  type="button"
                  onClick={() => setThemeTab("dark")}
                  className={cn(
                    "rounded-lg px-3 py-1 font-medium",
                    themeTab === "dark"
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  Chế độ Tối (8)
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {visibleThemes.map((t) => {
                const active = curTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTheme(t.id)}
                    className={cn(
                      "overflow-hidden rounded-xl border p-2 text-left",
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
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-primary)]">Màu nhấn riêng</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={customAccent || "#2563eb"}
                  onChange={(e) => selectAccent(e.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-transparent p-0.5"
                />
                <button
                  type="button"
                  onClick={() => selectAccent(null)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)]"
                  title="Về mặc định"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-[var(--text-primary)]">
                <Type className="h-3.5 w-3.5 text-[var(--accent)]" />
                Cặp phông chữ
              </label>
              <select
                value={fontStyle}
                onChange={(e) => selectFont(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
              >
                {FONT_STYLES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-primary)]">Độ bo góc thẻ</label>
              <select
                value={borderRadius}
                onChange={(e) => selectRadius(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
              >
                {RADIUS_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Họa tiết & Hình nền</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => selectWallpaper(wp.id)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-medium",
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
                placeholder="Dán URL ảnh nền riêng (https://...)"
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => customUrl.trim() && selectWallpaper(customUrl.trim())}
                className="rounded-xl bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </section>

        {/* PROFILE, PASSWORD & BACKUP */}
        <div className="space-y-6 lg:col-span-5">
          <form onSubmit={saveProfile} className="glass-card card-lift space-y-3 p-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-base font-medium text-[var(--text-primary)]">Hồ sơ & Mục tiêu</h3>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên hiển thị"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Khẩu hiệu"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <input
              type="number"
              min={15}
              max={720}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <Save className="h-3.5 w-3.5" />
              Lưu hồ sơ
            </button>
            {savedMsg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{savedMsg}</p>}
          </form>

          <form onSubmit={handleChangePassword} className="glass-card card-lift space-y-3 p-6">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-base font-medium text-[var(--text-primary)]">Đổi mật khẩu</h3>
            </div>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Mật khẩu hiện tại"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <button
              type="submit"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)]"
            >
              Cập nhật mật khẩu
            </button>
            {pwMsg && <p className="text-xs text-[var(--accent)]">{pwMsg}</p>}
          </form>

          <section className="glass-card card-lift space-y-3 p-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
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
              <button
                type="button"
                onClick={toggleDensity}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
              >
                Mật độ: {compactUi ? "Gọn (Compact)" : "Thoải mái"}
              </button>
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedSample}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent)] disabled:opacity-50"
              >
                {seeding ? "Đang nạp..." : "Nạp dữ liệu mẫu (1 click)"}
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]">
                <Upload className="h-3.5 w-3.5 text-[var(--accent)]" />
                Khôi phục JSON
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
            {restoreMsg && <p className="text-xs text-[var(--accent)]">{restoreMsg}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
