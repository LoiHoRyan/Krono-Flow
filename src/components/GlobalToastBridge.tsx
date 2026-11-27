"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  tone: "info" | "success" | "warn";
}

export function GlobalToastBridge() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string; tone?: "info" | "success" | "warn" }>).detail;
      const msg = detail?.message?.trim();
      if (!msg) return;
      const tone = detail?.tone ?? "success";
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { id, message: msg, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2800);
    };

    window.addEventListener("kronoflow-toast", onToast);
    return () => window.removeEventListener("kronoflow-toast", onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="no-print pointer-events-none fixed left-1/2 top-4 z-[95] flex w-[92vw] max-w-md -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-pop pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-xl backdrop-blur-md"
        >
          {t.tone === "warn" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          ) : t.tone === "info" ? (
            <Info className="h-4 w-4 shrink-0 text-sky-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
