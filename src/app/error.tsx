"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw, Trash2 } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("KronoFlow Error Boundary:", error);
  }, [error]);

  const handleSafeCacheClear = () => {
    try {
      const keepPrefixes = ["kronoflow-media-links", "kronoflow-formulas", "kronoflow-sticky", "kronoflow-group"];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("kronoflow-") && !keepPrefixes.some((p) => k.startsWith(p))) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
    reset();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-base font-bold">Đã có sự cố hiển thị nhỏ</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          Dữ liệu học tập trên PostgreSQL vẫn an toàn. Bạn có thể bấm thử tải lại hoặc dọn bộ nhớ tạm của giao diện bên dưới.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Thử tải lại
          </button>
          <button
            type="button"
            onClick={handleSafeCacheClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold hover:border-[var(--accent)]"
          >
            <Trash2 className="h-3.5 w-3.5" /> Dọn cache tạm
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold hover:border-[var(--accent)]"
          >
            <Home className="h-3.5 w-3.5" /> Trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
