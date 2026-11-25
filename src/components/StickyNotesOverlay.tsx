"use client";

import { useEffect, useState } from "react";
import { Palette, Plus, StickyNote, Trash2, X } from "lucide-react";

interface StickyItem {
  id: string;
  text: string;
  tone: "amber" | "sky" | "rose" | "violet";
}

const STICKY_KEY = "kronoflow-sticky-notes-v1";
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
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

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
    <div className="no-print fixed bottom-5 right-5 z-[60] w-[min(92vw,320px)] space-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
          Giấy nhớ dán nổi ({stickies.length}/4)
        </div>
        <div className="flex items-center gap-1">
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
