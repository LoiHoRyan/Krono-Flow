"use client";

import { Keyboard, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

const SHORTCUTS = [
  { keys: "Ctrl + K / /", vi: "Mở Tìm kiếm toàn cục & Chuyển tab nhanh", en: "Global Search & Quick Jump" },
  { keys: "Q", vi: "Mở hộp thoại Thêm nhanh (Việc, Ghi chú, Thẻ, Chi tiêu)", en: "Open Quick Capture modal" },
  { keys: "N", vi: "Bật / Tắt ngăn kéo Giấy nháp nhanh (Scratchpad)", en: "Toggle Quick Scratchpad" },
  { keys: "B", vi: "Ẩn / Hiện thanh bên (Sidebar)", en: "Toggle Sidebar" },
  { keys: "Space", vi: "Bắt đầu / Tạm dừng đồng hồ Pomodoro", en: "Start / Pause Pomodoro" },
  { keys: "?", vi: "Mở bảng phím tắt này", en: "Open Shortcuts Cheat Sheet" },
  { keys: "Esc", vi: "Đóng hộp thoại đang mở", en: "Close active modal or drawer" },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Keyboard className="h-4 w-4 text-[var(--accent)]" />
            {lang === "vi" ? "Phím tắt thao tác nhanh" : "Keyboard Shortcuts"}
          </span>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <ul className="mt-3 divide-y divide-[var(--border-subtle)] text-xs">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[var(--text-secondary)]">
                {lang === "vi" ? s.vi : s.en}
              </span>
              <kbd className="shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
