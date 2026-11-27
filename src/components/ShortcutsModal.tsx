"use client";

import { Keyboard, Play, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface ShortcutItem {
  id: string;
  keys: string;
  vi: string;
  en: string;
  group: "nav" | "tools";
  clickable?: boolean;
}

const SHORTCUTS: ShortcutItem[] = [
  { id: "spotlight", keys: "Alt + K", vi: "Tìm kiếm Toàn cục (Ghi chú, Thẻ, Kỳ thi)", en: "Global Spotlight Search", group: "tools", clickable: true },
  { id: "dock", keys: "Alt + T", vi: "Mở Ngăn kéo Công cụ Học tập (Study Dock)", en: "Open Study Dock Drawer", group: "tools", clickable: true },
  { id: "standby", keys: "Alt + S", vi: "Mở Đồng hồ Bàn học & Đếm ngược Kỳ thi", en: "Open Standby Clock & Exam Wall", group: "tools", clickable: true },
  { id: "ai", keys: "A", vi: "Mở Trợ lý AI Copilot", en: "Open AI Study Copilot", group: "tools", clickable: true },
  { id: "quick", keys: "Q", vi: "Mở hộp thoại Thêm nhanh", en: "Open Quick Capture modal", group: "tools", clickable: true },
  { id: "pad", keys: "N", vi: "Bật / Tắt Giấy nháp nhanh (Scratchpad)", en: "Toggle Quick Scratchpad", group: "tools", clickable: true },
  { id: "toolbar", keys: "Alt + H", vi: "Thu gọn / Mở rộng thanh công cụ phụ", en: "Collapse / Expand Sub-Toolbar", group: "nav", clickable: true },
  { id: "zen", keys: "Alt + Z", vi: "Chế độ Tập trung Toàn màn hình (Zen)", en: "Toggle Zen Focus Mode", group: "nav", clickable: true },
  { id: "sidebar", keys: "B", vi: "Đổi chế độ Sidebar (Đầy đủ → Icon → Ẩn)", en: "Cycle Sidebar (Full → Rail → Hidden)", group: "nav", clickable: true },
  { id: "prevtab", keys: "Alt + B", vi: "Quay lại tab vừa xem trước đó", en: "Jump to Previous Tab", group: "nav", clickable: true },
  { id: "tabs", keys: "Alt + 1..9", vi: "Chuyển nhanh 9 tab chính", en: "Switch Main Tabs 1–9", group: "nav" },
  { id: "pomo", keys: "Alt + Space", vi: "Bắt đầu / Tạm dừng Pomodoro từ mọi tab", en: "Start / Pause Pomodoro Anywhere", group: "tools" },
  { id: "privacy", keys: "P", vi: "Bật / Tắt Chế độ Riêng tư (làm mờ số liệu)", en: "Toggle Privacy Blur Mode", group: "nav", clickable: true },
  { id: "cmd", keys: "Ctrl + K / /", vi: "Mở bảng Lệnh nhanh", en: "Open Command Palette", group: "nav", clickable: true },
  { id: "help", keys: "?", vi: "Mở bảng phím tắt này", en: "Open Shortcuts Cheat Sheet", group: "nav" },
  { id: "esc", keys: "Esc", vi: "Đóng hộp thoại đang mở", en: "Close active modal or drawer", group: "nav" },
];

export function ShortcutsModal({
  open,
  onClose,
  onTrigger,
}: {
  open: boolean;
  onClose: () => void;
  onTrigger?: (actionId: string) => void;
}) {
  const { lang } = useLang();
  if (!open) return null;

  const groups: { id: "tools" | "nav"; titleVi: string; titleEn: string }[] = [
    { id: "tools", titleVi: "Công cụ & Thao tác nhanh", titleEn: "Tools & Quick Actions" },
    { id: "nav", titleVi: "Điều hướng & Giao diện", titleEn: "Navigation & Layout" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Keyboard className="h-4 w-4 text-[var(--accent)]" />
              {lang === "vi" ? "Phím tắt tương tác (?)" : "Interactive Keyboard Shortcuts (?)"}
            </span>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {lang === "vi"
                ? "Bấm trực tiếp vào dòng có nút chạy để kích hoạt ngay."
                : "Click any actionable row to run it immediately."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {groups.map((grp) => (
            <div key={grp.id}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {lang === "vi" ? grp.titleVi : grp.titleEn}
              </p>
              <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 text-xs">
                {SHORTCUTS.filter((s) => s.group === grp.id).map((s) => {
                  const canRun = Boolean(s.clickable && onTrigger);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-[var(--text-secondary)]">
                        {lang === "vi" ? s.vi : s.en}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <kbd className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                          {s.keys}
                        </kbd>
                        {canRun && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onTrigger?.(s.id);
                            }}
                            title="Chạy ngay"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
