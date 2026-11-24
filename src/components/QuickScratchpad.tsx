"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Trash2, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function QuickScratchpad({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const [text, setText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("kronoflow-scratchpad");
    if (saved) setText(saved);
  }, []);

  const handleChange = (val: string) => {
    setText(val);
    localStorage.setItem("kronoflow-scratchpad", val);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="animate-slide-right flex h-full w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              {lang === "vi" ? "Giấy nháp nhanh (Scratchpad)" : "Quick Scratchpad"}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleChange("")}
              title={lang === "vi" ? "Xóa nháp" : "Clear"}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {lang === "vi"
            ? "Tự động lưu tức thì khi bạn gõ — tiện ghi công thức hoặc ý tưởng lúc đang học."
            : "Auto-saved locally as you type — jot down formulas or ideas without leaving your tab."}
        </p>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={
            lang === "vi"
              ? "Ghi nhanh ý tưởng, công thức, từ vựng mới..."
              : "Jot down ideas, formulas, or quick reminders..."
          }
          className="mt-3 flex-1 resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-sm leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </aside>
    </div>
  );
}
