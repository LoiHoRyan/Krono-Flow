"use client";

import { useEffect, useState } from "react";
import {
  Bookmark,
  BookMarked,
  ClipboardCheck,
  Cpu,
  LayoutGrid,
  Lock,
  Monitor,
  Music2,
  PenTool,
  Presentation,
  Search,
  Star,
  StickyNote,
  Timer,
  Wrench,
  X,
  Zap,
} from "lucide-react";

const PINS_KEY = "kronoflow-dock-pins-v1";

export function StudyDockDrawer({
  open,
  onClose,
  onOpenSpotlight,
  onOpenWhiteboard,
  onOpenAllocator,
  onOpenToolkit,
  onOpenUtils,
  onOpenProSuite,
  onToggleSticky,
  onOpenStandby,
  onToggleMedia,
  onOpenTechLab,
  onOpenPacer,
  onOpenPortals,
  onOpenMindRead,
  onOpenLifePin,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSpotlight: () => void;
  onOpenWhiteboard: () => void;
  onOpenAllocator: () => void;
  onOpenToolkit: () => void;
  onOpenUtils: () => void;
  onOpenProSuite: () => void;
  onToggleSticky: () => void;
  onOpenStandby: () => void;
  onToggleMedia: () => void;
  onOpenTechLab: () => void;
  onOpenPacer: () => void;
  onOpenPortals: () => void;
  onOpenMindRead: () => void;
  onOpenLifePin: () => void;
}) {
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (raw) setPinned(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const actions = [
    {
      id: "spotlight",
      title: "Tìm kiếm Toàn cục (Alt+K)",
      desc: "Tìm xuyên suốt Ghi chú, Flashcard, Công thức, Todo, Kỳ thi",
      icon: Search,
      color: "text-sky-500",
      onClick: onOpenSpotlight,
    },
    {
      id: "prosuite",
      title: "Thuyết trình, Tiểu luận, Eisenhower & Học bổng",
      desc: "Teleprompter, Soát bài, Ma trận 4 ô, Ngủ 90p & Thẻ PNG",
      icon: Presentation,
      color: "text-indigo-500",
      onClick: onOpenProSuite,
    },
    {
      id: "toolkit",
      title: "Bộ công cụ Ôn thi thực chiến",
      desc: "Phiếu A4, Làm đề, So sánh, D-14, Chống cấm thi & Chốt ngày",
      icon: ClipboardCheck,
      color: "text-emerald-500",
      onClick: onOpenToolkit,
    },
    {
      id: "allocator",
      title: "Sổ tay Công thức & Phân bổ giờ ôn",
      desc: "Lưu công thức theo môn & chia giờ ôn theo độ tự tin",
      icon: BookMarked,
      color: "text-amber-500",
      onClick: onOpenAllocator,
    },
    {
      id: "whiteboard",
      title: "Bảng Nháp Vẽ tay (Whiteboard)",
      desc: "Vẽ sơ đồ cây CTDL, lưu đồ, nháp toán & lưu ảnh PNG",
      icon: PenTool,
      color: "text-rose-500",
      onClick: onOpenWhiteboard,
    },
    {
      id: "utils",
      title: "Tiện ích Sinh viên",
      desc: "Trích dẫn APA/IEEE, Lịch 1 ngày, Chia tiền nhóm, Cà phê",
      icon: Wrench,
      color: "text-violet-500",
      onClick: onOpenUtils,
    },
    {
      id: "techlab",
      title: "Phòng Lab Kỹ thuật, Big-O, Tài chính & JSON",
      desc: "Hệ cơ số DEC/BIN/HEX, Big-O TLE, Lãi kép FV/PV & JSON",
      icon: Cpu,
      color: "text-teal-500",
      onClick: onOpenTechLab,
    },
    {
      id: "pacer",
      title: "Chia chặng Bài thi, Biên bản Họp & Kho Lệnh",
      desc: "Đồng hồ nhiều phần thi, Biên bản Markdown & Lệnh Git/SQL",
      icon: Timer,
      color: "text-orange-500",
      onClick: onOpenPacer,
    },
    {
      id: "portals",
      title: "Cổng Học tập, Ảnh Kế hoạch & Mốc Ghi chú",
      desc: "Ghim link trường/LMS, xuất ảnh Checklist PNG, mốc ghi chú & so sánh tuần",
      icon: Bookmark,
      color: "text-blue-500",
      onClick: onOpenPortals,
    },
    {
      id: "mindread",
      title: "Đọc nhanh RSVP, Từ vựng, Sơ đồ Cây & Bốc thăm",
      desc: "Đọc 200-600 WPM, phát âm từ vựng, cây tư duy & chia nhóm",
      icon: Zap,
      color: "text-fuchsia-500",
      onClick: onOpenMindRead,
    },
    {
      id: "lifepin",
      title: "Tiến độ Học kỳ, Hũ Tiết kiệm, Hít thở & Khóa PIN",
      desc: "Thanh tiến độ kỳ học, mục tiêu tiết kiệm, thở 4-7-8 & PIN 4 số",
      icon: Lock,
      color: "text-emerald-600",
      onClick: onOpenLifePin,
    },
    {
      id: "sticky",
      title: "Giấy nhớ Dán nổi (Sticky Notes)",
      desc: "Ghi chú dán nhanh màu pastel ngay góc màn hình",
      icon: StickyNote,
      color: "text-yellow-500",
      onClick: onToggleSticky,
    },
    {
      id: "media",
      title: "Trình phát Nhạc Tập trung",
      desc: "Phát tệp máy tính & link YouTube / TikTok / FB / IG",
      icon: Music2,
      color: "text-pink-500",
      onClick: onToggleMedia,
    },
    {
      id: "standby",
      title: "Đồng hồ để bàn chờ (Alt+S)",
      desc: "Màn hình chờ tối giản kèm đếm ngược kỳ thi gần nhất",
      icon: Monitor,
      color: "text-cyan-500",
      onClick: onOpenStandby,
    },
  ];

  const sortedActions = [...actions].sort((a, b) => {
    const pa = pinned.includes(a.id) ? 0 : 1;
    const pb = pinned.includes(b.id) ? 0 : 1;
    return pa - pb;
  });

  return (
    <div
      className="no-print fixed inset-0 z-[75] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Kho Công cụ Học tập (Study Dock · Alt+T)
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Nhấn dấu sao ⭐ để ghim công cụ hay dùng lên hàng đầu tiên.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {sortedActions.map((act) => {
            const Icon = act.icon;
            const isPinned = pinned.includes(act.id);
            return (
              <div
                key={act.id}
                className={`relative flex items-start gap-3 rounded-xl border p-3 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40 ${
                  isPinned
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    act.onClick();
                  }}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <div className={`mt-0.5 rounded-lg bg-[var(--bg-surface)] p-2 ${act.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{act.title}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{act.desc}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => togglePin(act.id)}
                  title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                  className={`absolute right-2.5 top-2.5 rounded p-1 transition ${
                    isPinned ? "text-amber-500" : "text-[var(--text-muted)] opacity-50 hover:opacity-100"
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${isPinned ? "fill-amber-500" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
