"use client";

import { useEffect, useState } from "react";
import {
  BarChart2,
  Bookmark,
  BookMarked,
  ClipboardCheck,
  Coffee,
  Compass,
  Flame,
  Cpu,
  LayoutGrid,
  Lock,
  Monitor,
  Music2,
  PenTool,
  Presentation,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  StickyNote,
  Timer,
  Wrench,
  X,
  Zap,
} from "lucide-react";

const PINS_KEY = "kronoflow-dock-pins-v1";

type DockCategory = "all" | "exam" | "tech" | "life";

function normVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

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
  onOpenWrappedDiff,
  onOpenAcademicHub,
  onOpenRubricQa,
  onOpenCramReport,
  onOpenMicroBreak,
  onOpenRehearsalGuard,
  onOpenDeadlineSim,
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
  onOpenWrappedDiff: () => void;
  onOpenAcademicHub: () => void;
  onOpenRubricQa: () => void;
  onOpenCramReport: () => void;
  onOpenMicroBreak: () => void;
  onOpenRehearsalGuard: () => void;
  onOpenDeadlineSim: () => void;
}) {
  const [pinned, setPinned] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DockCategory>("all");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (raw) setPinned(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
  }, [open]);

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

  const actions: {
    id: string;
    cat: Exclude<DockCategory, "all">;
    title: string;
    desc: string;
    icon: typeof Search;
    color: string;
    onClick: () => void;
  }[] = [
    {
      id: "spotlight",
      cat: "tech",
      title: "Tìm kiếm Toàn cục (Alt+K)",
      desc: "Tìm xuyên suốt Ghi chú, Flashcard, Công thức, Todo, Kỳ thi",
      icon: Search,
      color: "text-sky-500",
      onClick: onOpenSpotlight,
    },
    {
      id: "deadlinesim",
      cat: "exam",
      title: "Radar Hạn chót, Trang sách & Phòng thi thử",
      desc: "Gom mọi hạn chót Todo/Thi/Mục tiêu, đánh dấu trang PDF & mô phỏng phòng thi 50 câu",
      icon: Radar,
      color: "text-sky-600",
      onClick: onOpenDeadlineSim,
    },
    {
      id: "rehearsalguard",
      cat: "exam",
      title: "Tập Thuyết Trình, Chống Rớt Môn & Đọc chính tả",
      desc: "Đồng hồ chia chặng slide + Cue Cards, tính điểm tối thiểu cuối kỳ & ghi chú giọng nói",
      icon: ShieldAlert,
      color: "text-rose-500",
      onClick: onOpenRehearsalGuard,
    },
    {
      id: "microbreak",
      cat: "life",
      title: "Nghỉ 2p, Mốc thi 7-3-1 & Đếm từ/Nói",
      desc: "Hướng dẫn nghỉ giải lao 2 phút, mốc ôn thi D-7/D-3/D-1 & tính phút thuyết trình",
      icon: Coffee,
      color: "text-amber-600",
      onClick: onOpenMicroBreak,
    },
    {
      id: "cramreport",
      cat: "exam",
      title: "Ôn cấp tốc 15p, Time-Blocking & Báo cáo Tuần",
      desc: "Luyện Flashcard + Lỗi sai 15 phút, khóa giờ học 24h & xuất báo cáo A4/MD",
      icon: Flame,
      color: "text-orange-500",
      onClick: onOpenCramReport,
    },
    {
      id: "rubricqa",
      cat: "exam",
      title: "Khởi động 5p, Rubric, Sổ hỏi GV, Lịch thi A4 & Múi giờ",
      desc: "Phá lười 5 phút, tự chấm điểm đồ án, hỏi đáp giảng viên & giờ thế giới",
      icon: Compass,
      color: "text-emerald-500",
      onClick: onOpenRubricQa,
    },
    {
      id: "prosuite",
      cat: "exam",
      title: "Thuyết trình, Tiểu luận, Eisenhower & Học bổng",
      desc: "Teleprompter, Soát bài, Ma trận 4 ô, Ngủ 90p & Thẻ PNG",
      icon: Presentation,
      color: "text-indigo-500",
      onClick: onOpenProSuite,
    },
    {
      id: "toolkit",
      cat: "exam",
      title: "Bộ công cụ Ôn thi thực chiến",
      desc: "Phiếu A4, Làm đề, So sánh, D-14, Chống cấm thi & Chốt ngày",
      icon: ClipboardCheck,
      color: "text-emerald-600",
      onClick: onOpenToolkit,
    },
    {
      id: "allocator",
      cat: "exam",
      title: "Sổ tay Công thức & Phân bổ giờ ôn",
      desc: "Lưu công thức theo môn & chia giờ ôn theo độ tự tin",
      icon: BookMarked,
      color: "text-amber-500",
      onClick: onOpenAllocator,
    },
    {
      id: "whiteboard",
      cat: "tech",
      title: "Bảng Nháp Vẽ tay (Whiteboard)",
      desc: "Vẽ sơ đồ cây CTDL, lưu đồ, nháp toán & lưu ảnh PNG",
      icon: PenTool,
      color: "text-rose-500",
      onClick: onOpenWhiteboard,
    },
    {
      id: "utils",
      cat: "life",
      title: "Tiện ích Sinh viên",
      desc: "Trích dẫn APA/IEEE, Lịch 1 ngày, Chia tiền nhóm, Cà phê",
      icon: Wrench,
      color: "text-violet-500",
      onClick: onOpenUtils,
    },
    {
      id: "techlab",
      cat: "tech",
      title: "Phòng Lab Kỹ thuật, Big-O, Tài chính & JSON",
      desc: "Hệ cơ số DEC/BIN/HEX, Big-O TLE, Lãi kép FV/PV & JSON",
      icon: Cpu,
      color: "text-teal-500",
      onClick: onOpenTechLab,
    },
    {
      id: "pacer",
      cat: "exam",
      title: "Chia chặng Bài thi, Biên bản Họp & Kho Lệnh",
      desc: "Đồng hồ nhiều phần thi, Biên bản Markdown & Lệnh Git/SQL",
      icon: Timer,
      color: "text-orange-500",
      onClick: onOpenPacer,
    },
    {
      id: "portals",
      cat: "life",
      title: "Cổng Học tập, Ảnh Kế hoạch & Mốc Ghi chú",
      desc: "Ghim link trường/LMS, xuất ảnh Checklist PNG, mốc ghi chú & so sánh tuần",
      icon: Bookmark,
      color: "text-blue-500",
      onClick: onOpenPortals,
    },
    {
      id: "mindread",
      cat: "exam",
      title: "Đọc nhanh RSVP, Từ vựng, Sơ đồ Cây & Bốc thăm",
      desc: "Đọc 200-600 WPM, phát âm từ vựng, cây tư duy & chia nhóm",
      icon: Zap,
      color: "text-fuchsia-500",
      onClick: onOpenMindRead,
    },
    {
      id: "lifepin",
      cat: "life",
      title: "Tiến độ Học kỳ, Hũ Tiết kiệm, Hít thở & Khóa PIN",
      desc: "Thanh tiến độ kỳ học, mục tiêu tiết kiệm, thở 4-7-8 & PIN 4 số",
      icon: Lock,
      color: "text-emerald-600",
      onClick: onOpenLifePin,
    },
    {
      id: "wrapped",
      cat: "tech",
      title: "Tổng kết Học kỳ, So sánh Văn bản & Xoay vòng Nhóm",
      desc: "Xuất ảnh Semester Wrapped PNG, Diff 2 bản nháp & Lịch trực nhóm",
      icon: Sparkles,
      color: "text-purple-500",
      onClick: onOpenWrappedDiff,
    },
    {
      id: "academichub",
      cat: "life",
      title: "Hiệu suất Điểm, Ngân sách 50/30/20, Mẫu Email & Hành chính",
      desc: "Giờ học ↔ GPA, chia quỹ tháng, mẫu email SV, hạn tín chỉ & thẻ share PNG",
      icon: BarChart2,
      color: "text-cyan-600",
      onClick: onOpenAcademicHub,
    },
    {
      id: "sticky",
      cat: "life",
      title: "Giấy nhớ Dán nổi (Sticky Notes)",
      desc: "Ghi chú dán nhanh màu pastel ngay góc màn hình",
      icon: StickyNote,
      color: "text-yellow-500",
      onClick: onToggleSticky,
    },
    {
      id: "media",
      cat: "life",
      title: "Trình phát Nhạc Tập trung",
      desc: "Tìm 30 kết quả, Lặp 1, Hàng đợi, Spotify/SoundCloud & Âm nền offline",
      icon: Music2,
      color: "text-pink-500",
      onClick: onToggleMedia,
    },
    {
      id: "standby",
      cat: "life",
      title: "Đồng hồ để bàn chờ (Alt+S)",
      desc: "Màn hình chờ tối giản kèm đếm ngược kỳ thi gần nhất",
      icon: Monitor,
      color: "text-cyan-500",
      onClick: onOpenStandby,
    },
  ];

  const qNorm = normVi(query.trim());
  const filteredActions = actions
    .filter((a) => {
      if (category !== "all" && a.cat !== category) return false;
      if (qNorm && !normVi(`${a.title} ${a.desc}`).includes(qNorm)) return false;
      return true;
    })
    .sort((a, b) => {
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
        className="kf-modal-in max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
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
                Gõ để tìm nhanh hoặc nhấn sao ⭐ để ghim công cụ lên đầu.
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

        {/* SEARCH + CATEGORY PILLS */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm công cụ (VD: email, vẽ, nhạc, gpa, rubric)..."
              className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex gap-1 text-[11px] font-medium">
            {(
              [
                ["all", "Tất cả"],
                ["exam", "Ôn thi"],
                ["tech", "Kỹ thuật"],
                ["life", "Đời sống"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setCategory(k)}
                className={`rounded-lg border px-2 py-1 ${
                  category === k
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {filteredActions.length === 0 ? (
            <p className="col-span-2 py-6 text-center text-xs text-[var(--text-muted)]">
              Không tìm thấy công cụ nào khớp với &quot;{query}&quot;.
            </p>
          ) : (
            filteredActions.map((act) => {
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
