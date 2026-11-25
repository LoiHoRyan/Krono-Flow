"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";

const EYECARE_KEY = "kronoflow-eyecare-202020";

export function EyeCareToggle() {
  const [enabled, setEnabled] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [restSecs, setRestSecs] = useState(20);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(EYECARE_KEY) === "on");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setRestSecs(20);
      setAlertOpen(true);
    }, 20 * 60 * 1000);
    return () => clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!alertOpen) return;
    const id = setInterval(() => {
      setRestSecs((s) => {
        if (s <= 1) {
          setAlertOpen(false);
          return 20;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [alertOpen]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(EYECARE_KEY, next ? "on" : "off");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        title={enabled ? "Đang bật nhắc nghỉ mắt 20-20-20 (nhấn để tắt)" : "Bật nhắc nghỉ mắt mỗi 20 phút (20-20-20)"}
        className={`no-print hidden rounded-xl border p-1.5 transition xl:inline-flex ${
          enabled
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <Eye className="h-4 w-4" />
      </button>

      {alertOpen && (
        <div className="no-print fixed bottom-5 right-5 z-[80] w-80 rounded-2xl border border-emerald-500/40 bg-[var(--bg-surface)] p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Eye className="h-4 w-4" /> Nghỉ mắt 20-20-20
            </div>
            <button
              type="button"
              onClick={() => setAlertOpen(false)}
              className="rounded-lg p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
            Bạn đã nhìn màn hình 20 phút. Hãy nhìn ra xa khoảng 6 mét trong{" "}
            <strong className="font-mono text-emerald-600">{restSecs} giây</strong> để thư giãn mắt nhé!
          </p>
        </div>
      )}
    </>
  );
}
