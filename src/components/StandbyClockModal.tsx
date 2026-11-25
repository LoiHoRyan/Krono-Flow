"use client";

import { useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";

const STANDBY_QUOTES = [
  "Tập trung sâu 1 giờ hơn 4 giờ học bị phân tâm.",
  "Kỷ luật nhỏ mỗi ngày tạo nên kết quả lớn cuối học kỳ.",
  "Chậm mà chắc — làm trọn vẹn từng trang sách một.",
];

export function StandbyClockModal({
  open,
  onClose,
  exams = [],
}: {
  open: boolean;
  onClose: () => void;
  exams?: { id: string; title: string; examDate: string }[];
}) {
  const [now, setNow] = useState(() => new Date());
  const [showCountdown, setShowCountdown] = useState(true);

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

  const nextExam = [...exams]
    .filter((ex) => new Date(ex.examDate).getTime() > now.getTime())
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];

  const diffMs = nextExam ? Math.max(0, new Date(nextExam.examDate).getTime() - now.getTime()) : 0;
  const dLeft = Math.floor(diffMs / 86400000);
  const hLeft = Math.floor((diffMs % 86400000) / 3600000);
  const mLeft = Math.floor((diffMs % 3600000) / 60000);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#090d16] p-6 text-slate-100"
      onClick={onClose}
    >
      <div className="fixed right-6 top-6 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {nextExam && (
          <button
            type="button"
            onClick={() => setShowCountdown((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/15 hover:text-white"
          >
            <CalendarClock className="h-3.5 w-3.5 text-sky-400" />
            {showCountdown ? "Ẩn đếm ngược thi" : "Hiện đếm ngược thi"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-white/5 p-2.5 text-slate-300 hover:bg-white/15 hover:text-white"
          title="Thoát đồng hồ chờ (Esc)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

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

        {showCountdown && nextExam && (
          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-xs text-sky-200">
            <CalendarClock className="h-4 w-4 text-sky-400" />
            <span className="font-semibold text-white">{nextExam.title}:</span>
            <span className="font-mono font-bold text-sky-300">
              Còn {dLeft} ngày {hLeft} giờ {mLeft} phút
            </span>
          </div>
        )}

        <p className="mx-auto mt-8 max-w-md text-xs italic text-slate-400">“{quote}”</p>
        <p className="mt-6 text-[11px] text-slate-500">Nhấn Esc hoặc chạm bất kỳ đâu để quay lại</p>
      </div>
    </div>
  );
}
