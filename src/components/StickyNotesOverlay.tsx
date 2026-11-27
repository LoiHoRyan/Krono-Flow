"use client";

import { useEffect, useRef, useState } from "react";
import { GripHorizontal, Palette, Plus, RotateCcw, StickyNote, Trash2, X } from "lucide-react";

interface StickyItem {
  id: string;
  text: string;
  tone: "amber" | "sky" | "rose" | "violet";
}

const STICKY_KEY = "kronoflow-sticky-notes-v1";
const STICKY_POS_KEY = "kronoflow-sticky-pos-v1";
const TONES: StickyItem["tone"][] = ["amber", "sky", "rose", "violet"];
const TONE_CLS: Record<StickyItem["tone"], string> = {
  amber: "border-amber-300 bg-amber-100/95 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/90 dark:text-amber-100",
  sky: "border-sky-300 bg-sky-100/95 text-sky-950 dark:border-sky-700/60 dark:bg-sky-950/90 dark:text-sky-100",
  rose: "border-rose-300 bg-rose-100/95 text-rose-950 dark:border-rose-700/60 dark:bg-rose-950/90 dark:text-rose-100",
  violet: "border-violet-300 bg-violet-100/95 text-violet-950 dark:border-violet-700/60 dark:bg-violet-950/90 dark:text-violet-100",
};

export function StickyNotesOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stickies, setStickies] = useState<StickyItem[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragOff = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STICKY_KEY);
      if (raw) {
        setStickies(JSON.parse(raw) as StickyItem[]);
      } else {
        setStickies([
          {
            id: "s1",
            text: "Ghi nhanh phòng thi, công thức hay việc cần nhớ...",
            tone: "amber",
          },
        ]);
      }
      const rawPos = localStorage.getItem(STICKY_POS_KEY);
      if (rawPos) {
        const p = JSON.parse(rawPos) as { x?: number; y?: number };
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          setPos({
            x: Math.max(8, Math.min(window.innerWidth - 330, p.x)),
            y: Math.max(8, Math.min(window.innerHeight - 220, p.y)),
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const w = boxRef.current?.offsetWidth ?? 320;
      const h = boxRef.current?.offsetHeight ?? 320;
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - dragOff.current.dx)),
        y: Math.max(8, Math.min(window.innerHeight - Math.min(h, window.innerHeight - 16) - 8, e.clientY - dragOff.current.dy)),
      });
    };
    const onUp = () => {
      setDragging(false);
      setPos((cur) => {
        if (cur) {
          try {
            localStorage.setItem(STICKY_POS_KEY, JSON.stringify(cur));
          } catch {
            // ignore
          }
        }
        return cur;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOff.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setPos({ x: rect.left, y: rect.top });
    setDragging(true);
  };

  const resetPos = () => {
    setPos(null);
    try {
      localStorage.removeItem(STICKY_POS_KEY);
    } catch {
      // ignore
    }
  };

  const save = (next: StickyItem[]) => {
    setStickies(next);
    try {
      localStorage.setItem(STICKY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addNote = () => {
    if (stickies.length >= 4) return;
    const tone = TONES[stickies.length % TONES.length] ?? "amber";
    save([...stickies, { id: `st-${Date.now()}`, text: "", tone }]);
  };

  return (
    <div
      ref={boxRef}
      style={pos ? { left: `${pos.x}px`, top: `${pos.y}px`, right: "auto", bottom: "auto" } : undefined}
      className={`no-print fixed z-[60] w-[min(92vw,320px)] space-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-3 shadow-2xl backdrop-blur ${
        dragging ? "transition-none" : "transition-opacity duration-200"
      } ${!pos ? "bottom-5 right-20" : ""} ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        onPointerDown={startDrag}
        title="Giữ và kéo để di chuyển giấy nhớ"
        className="flex cursor-grab select-none touch-none items-center justify-between border-b border-[var(--border-subtle)] pb-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
          Giấy nhớ ({stickies.length}/4)
          <GripHorizontal className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </div>
        <div className="flex items-center gap-1">
          {pos && (
            <button
              type="button"
              onClick={resetPos}
              title="Đặt lại góc"
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          {stickies.length < 4 && (
            <button
              type="button"
              onClick={addNote}
              title="Thêm tờ giấy nhớ"
              className="rounded-lg bg-[var(--accent-soft)] p-1 text-[var(--accent)]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Thu gọn giấy nhớ"
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-0.5">
        {stickies.map((n) => (
          <div key={n.id} className={`rounded-xl border p-2 text-xs shadow-sm ${TONE_CLS[n.tone]}`}>
            <div className="mb-1 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => {
                  const nextTone = TONES[(TONES.indexOf(n.tone) + 1) % TONES.length] ?? "amber";
                  save(stickies.map((x) => (x.id === n.id ? { ...x, tone: nextTone } : x)));
                }}
                title="Đổi màu"
                className="opacity-70 hover:opacity-100"
              >
                <Palette className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => save(stickies.filter((x) => x.id !== n.id))}
                title="Xóa tờ này"
                className="opacity-70 hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <textarea
              rows={3}
              value={n.text}
              onChange={(e) =>
                save(stickies.map((x) => (x.id === n.id ? { ...x, text: e.target.value } : x)))
              }
              placeholder="Nhập ghi chú dán..."
              className="w-full resize-none bg-transparent text-xs outline-none placeholder:opacity-60"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
