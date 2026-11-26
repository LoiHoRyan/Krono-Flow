"use client";

import {
  Bookmark,
  BookMarked,
  ClipboardCheck,
  LayoutGrid,
  Monitor,
  Music2,
  PenTool,
  Presentation,
  Search,
  StickyNote,
  Cpu,
  Timer,
  Lock,
  Wrench,
  X,
  Zap,
} from "lucide-react";

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
  if (!open) return null;

  const actions = [
    {
      title: "Tìm kiếm Toàn cục (Alt+K)",
      desc: "Tìm xuyên suốt Ghi chú, Flashcard, Công thức, Todo, Kỳ thi",
      icon: Search,
      color: "text-sky-500",
      onClick: onOpenSpotlight,
    },
    {
      title: "Thuyết trình, Tiểu luận, Eisenhower & Học bổng",
      desc: "Teleprompter, Soát bài, Ma trận 4 ô, Ngủ 90p & Thẻ PNG",
      icon: Presentation,
      color: "text-indigo-500",
      onClick: onOpenProSuite,
    },
    {
      title: "Bộ công cụ Ôn thi thực chiến",
      desc: "Phiếu A4, Làm đề, So sánh, D-14, Chống cấm thi & Chốt ngày",
      icon: ClipboardCheck,
      color: "text-emerald-500",
      onClick: onOpenToolkit,
    },
    {
      title: "Sổ tay Công thức & Phân bổ giờ ôn",
      desc: "Lưu công thức theo môn & chia giờ ôn theo độ tự tin",
      icon: BookMarked,
      color: "text-amber-500",
      onClick: onOpenAllocator,
    },
    {
      title: "Bảng Nháp Vẽ tay (Whiteboard)",
      desc: "Vẽ sơ đồ cây CTDL, lưu đồ, nháp toán & lưu ảnh PNG",
      icon: PenTool,
      color: "text-rose-500",
      onClick: onOpenWhiteboard,
    },
    {
      title: "Tiện ích Sinh viên",
      desc: "Trích dẫn APA/IEEE, Lịch 1 ngày, Chia tiền nhóm, Cà phê",
      icon: Wrench,
      color: "text-violet-500",
      onClick: onOpenUtils,
    },
    {
      title: "Phòng Lab Kỹ thuật, Big-O, Tài chính & JSON",
      desc: "Hệ cơ số DEC/BIN/HEX, Big-O TLE, Lãi kép FV/PV & JSON",
      icon: Cpu,
      color: "text-teal-500",
      onClick: onOpenTechLab,
    },
    {
      title: "Chia chặng Bài thi, Biên bản Họp & Kho Lệnh",
      desc: "Đồng hồ nhiều phần thi, Biên bản Markdown & Lệnh Git/SQL",
      icon: Timer,
      color: "text-orange-500",
      onClick: onOpenPacer,
    },
    {
      title: "Cổng Học tập, Ảnh Kế hoạch & Mốc Ghi chú",
      desc: "Ghim link trường/LMS, xuất ảnh Checklist PNG, mốc ghi chú & so sánh tuần",
      icon: Bookmark,
      color: "text-blue-500",
      onClick: onOpenPortals,
    },
    {
      title: "Đọc nhanh RSVP, Từ vựng, Sơ đồ Cây & Bốc thăm",
      desc: "Đọc 200-600 WPM, phát âm từ vựng, cây tư duy & chia nhóm",
      icon: Zap,
      color: "text-fuchsia-500",
      onClick: onOpenMindRead,
    },
    {
      title: "Tiến độ Học kỳ, Hũ Tiết kiệm, Hít thở & Khóa PIN",
      desc: "Thanh tiến độ kỳ học, mục tiêu tiết kiệm, thở 4-7-8 & PIN 4 số",
      icon: Lock,
      color: "text-emerald-600",
      onClick: onOpenLifePin,
    },
    {
      title: "Giấy nhớ Dán nổi (Sticky Notes)",
      desc: "Ghi chú dán nhanh màu pastel ngay góc màn hình",
      icon: StickyNote,
      color: "text-yellow-500",
      onClick: onToggleSticky,
    },
    {
      title: "Trình phát Nhạc Tập trung",
      desc: "Phát tệp máy tính & link YouTube / TikTok / FB / IG",
      icon: Music2,
      color: "text-pink-500",
      onClick: onToggleMedia,
    },
    {
      title: "Đồng hồ để bàn chờ (Alt+S)",
      desc: "Màn hình chờ tối giản kèm đếm ngược kỳ thi gần nhất",
      icon: Monitor,
      color: "text-cyan-500",
      onClick: onOpenStandby,
    },
  ];

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
                Mở nhanh toàn bộ tiện ích trên cả máy tính lẫn điện thoại.
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
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                type="button"
                onClick={() => {
                  onClose();
                  act.onClick();
                }}
                className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
              >
                <div className={`mt-0.5 rounded-lg bg-[var(--bg-surface)] p-2 ${act.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{act.title}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{act.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
