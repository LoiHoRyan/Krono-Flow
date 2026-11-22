"use client";

import { useEffect, useState } from "react";
import { Wind, X, Play, Pause, RotateCcw } from "lucide-react";

const PHASES = [
  { name: "Hít vào chậm qua mũi", seconds: 4, scale: "scale-125", color: "bg-sky-500/25 border-sky-400" },
  { name: "Giữ hơi nhẹ nhàng", seconds: 7, scale: "scale-125", color: "bg-violet-500/25 border-violet-400" },
  { name: "Thở ra đều qua miệng", seconds: 8, scale: "scale-90", color: "bg-emerald-500/25 border-emerald-400" },
] as const;

export function BreathingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secLeft, setSecLeft] = useState<number>(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!open || !running) return;
    const id = setInterval(() => {
      setSecLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIdx((p) => {
          const next = (p + 1) % PHASES.length;
          if (next === 0) setCycles((c) => c + 1);
          setSecLeft((PHASES[next] ?? PHASES[0]).seconds);
          return next;
        });
        return 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, running]);

  if (!open) return null;
  const phase = PHASES[phaseIdx] ?? PHASES[0];

  const reset = () => {
    setRunning(false);
    setPhaseIdx(0);
    setSecLeft(PHASES[0].seconds);
    setCycles(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
            <Wind className="h-4 w-4" />
            Bài tập thở 4–7–8 phục hồi tập trung
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Thực hiện 3–4 chu kỳ giúp giảm căng thẳng và làm mới trí nhớ giữa các phiên học dài.
        </p>

        <div className="my-10 flex flex-col items-center justify-center">
          <div
            className={`flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 transition-all duration-1000 ${
              running ? phase.scale : "scale-100"
            } ${phase.color}`}
          >
            <span className="font-mono text-4xl font-semibold text-[var(--text-primary)]">
              {secLeft}s
            </span>
            <span className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]">
              Chu kỳ #{cycles + 1}
            </span>
          </div>
          <p className="mt-6 text-sm font-medium text-[var(--text-primary)]">
            {running ? phase.name : "Nhấn Bắt đầu và thả lỏng vai"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-medium"
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? "Tạm dừng" : "Bắt đầu"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
}
