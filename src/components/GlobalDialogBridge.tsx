"use client";

import { useEffect, useState } from "react";
import { HelpCircle, MessageSquareText, X } from "lucide-react";
import type { DialogEventDetail } from "@/lib/notify";

export function GlobalDialogBridge() {
  const [active, setActive] = useState<DialogEventDetail | null>(null);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    const onDialog = (e: Event) => {
      const detail = (e as CustomEvent<DialogEventDetail>).detail;
      if (!detail) return;
      setInputVal(detail.kind === "prompt" ? detail.defaultValue : "");
      setActive(detail);
    };
    window.addEventListener("kronoflow-dialog", onDialog);
    return () => window.removeEventListener("kronoflow-dialog", onDialog);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (active.kind === "confirm") active.resolve(false);
        else active.resolve(null);
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active) return null;

  const handleCancel = () => {
    if (active.kind === "confirm") active.resolve(false);
    else active.resolve(null);
    setActive(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active.kind === "confirm") active.resolve(true);
    else active.resolve(inputVal);
    setActive(null);
  };

  return (
    <div
      className="no-print fixed inset-0 z-[98] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            {active.kind === "confirm" ? (
              <HelpCircle className="h-4 w-4 text-[var(--accent)]" />
            ) : (
              <MessageSquareText className="h-4 w-4 text-[var(--accent)]" />
            )}
            <span>{active.title}</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{active.message}</p>

        {active.kind === "prompt" && (
          <input
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Hủy
          </button>
          <button
            type="submit"
            autoFocus={active.kind === "confirm"}
            className="btn-primary rounded-xl px-4 py-1.5 text-xs font-bold"
          >
            Xác nhận
          </button>
        </div>
      </form>
    </div>
  );
}
