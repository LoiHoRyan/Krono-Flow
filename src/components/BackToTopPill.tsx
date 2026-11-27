"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTopPill() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="Cuộn lên đầu trang"
      className={`no-print fixed bottom-20 right-5 z-30 inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-lg backdrop-blur transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] lg:bottom-6 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Đầu trang</span>
    </button>
  );
}
