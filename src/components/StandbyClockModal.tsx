"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STANDBY_QUOTES = [
  "Tập trung sâu 1 giờ hơn 4 giờ học bị phân tâm.",
  "Kỷ luật nhỏ mỗi ngày tạo nên kết quả lớn cuối học kỳ.",
  "Chậm mà chắc — làm trọn vẹn từng trang sách một.",
];

export function StandbyClockModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const quote = STANDBY_QUOTES[now.getDate() % STANDBY_QUOTES.length] ?? STANDBY_QUOTES[0];

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#090d16] p-6 text-slate-100"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-6 top-6 rounded-full border border-white/15 bg-white/5 p-2.5 text-slate-300 hover:bg-white/15 hover:text-white"
        title="Thoát đồng hồ chờ (Esc)"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-medium uppercase tracking-[0.25em] text-sky-400">
          KronoFlow · Desk Standby
        </div>
        <div className="mt-4 flex items-baseline justify-center gap-2 font-mono text-7xl font-bold tracking-tight tabular-nums sm:text-9xl">
          <span>{hh}</span>
          <span className="animate-pulse text-sky-400">:</span>
          <span>{mm}</span>
          <span className="ml-2 text-2xl font-normal text-slate-400 sm:text-4xl">{ss}</span>
        </div>
        <div className="mt-4 text-sm capitalize text-slate-300 sm:text-base">{dateStr}</div>
        <p className="mx-auto mt-8 max-w-md text-xs italic text-slate-400">“{quote}”</p>
        <p className="mt-6 text-[11px] text-slate-500">Nhấn Esc hoặc chạm bất kỳ đâu để quay lại</p>
      </div>
    </div>
  );
}
