"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Eye, Keyboard, RotateCcw, X, XCircle } from "lucide-react";

interface TypingCardInput {
  id: string;
  front: string;
  back: string;
}

function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function FlashcardTypingModal({
  open,
  onClose,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  cards: TypingCardInput[];
}) {
  const [seed, setSeed] = useState(0);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<null | "correct" | "wrong">(null);
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const deck = useMemo(() => {
    if (!open) return [];
    return [...cards]
      .sort((a, b) => ((a.id.charCodeAt(0) + seed * 19) % 89) - ((b.id.charCodeAt(0) + seed * 19) % 89))
      .slice(0, 20);
  }, [open, cards, seed]);

  if (!open) return null;

  const cur = deck[idx] ?? null;
  const done = deck.length > 0 && idx >= deck.length;

  const reset = () => {
    setSeed((s) => s + 1);
    setIdx(0);
    setInput("");
    setChecked(null);
    setShowHint(false);
    setCorrectCount(0);
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cur || !input.trim() || checked) return;
    const normUser = normalizeAnswer(input);
    const normAns = normalizeAnswer(cur.back);
    const isOk =
      normUser === normAns ||
      (normUser.length >= 4 && (normAns.includes(normUser) || normUser.includes(normAns)));
    setChecked(isOk ? "correct" : "wrong");
    if (isOk) setCorrectCount((c) => c + 1);
  };

  const handleNext = () => {
    setIdx((i) => i + 1);
    setInput("");
    setChecked(null);
    setShowHint(false);
  };

  const hintText = cur
    ? cur.back
        .split(/\s+/)
        .slice(0, 4)
        .map((w) => (w.length > 1 ? `${w[0]}${"•".repeat(Math.min(4, w.length - 1))}` : w))
        .join(" ")
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Ôn Flashcard — Chế độ Gõ đáp án (Typing Recall)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {deck.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">
            Chưa có thẻ Flashcard nào để luyện gõ.
          </p>
        ) : done ? (
          <div className="space-y-4 py-6 text-center">
            <div className="font-mono text-3xl font-bold text-[var(--accent)]">
              {correctCount} / {deck.length}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Chính xác <strong>{Math.round((correctCount / deck.length) * 100)}%</strong> lượt gõ đáp án!
            </p>
            <button
              type="button"
              onClick={reset}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Luyện lượt mới
            </button>
          </div>
        ) : cur ? (
          <form onSubmit={handleCheck} className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>
                Thẻ {idx + 1} / {deck.length}
              </span>
              <span className="font-mono font-semibold text-emerald-600">Đúng: {correctCount}</span>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-sm font-medium text-[var(--text-primary)]">
              {cur.front}
            </div>

            {showHint && !checked && (
              <div className="rounded-xl bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                Gợi ý: {hintText}
              </div>
            )}

            <textarea
              rows={2}
              value={input}
              disabled={Boolean(checked)}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Gõ đáp án của bạn (không phân biệt hoa/thường hay dấu)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />

            {checked && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  checked === "correct"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {checked === "correct" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Chính xác!
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> Chưa khớp hoàn toàn
                    </>
                  )}
                </div>
                <div className="mt-1 text-[var(--text-primary)]">
                  Đáp án chuẩn: <strong>{cur.back}</strong>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {!checked ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowHint((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                  >
                    <Eye className="h-3.5 w-3.5" /> {showHint ? "Ẩn gợi ý" : "Gợi ý chữ đầu"}
                  </button>
                  <button type="submit" className="btn-primary rounded-xl px-4 py-1.5 text-xs font-medium">
                    Kiểm tra đáp án
                  </button>
                </>
              ) : (
                <div className="flex w-full justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary rounded-xl px-4 py-1.5 text-xs font-medium"
                  >
                    {idx + 1 >= deck.length ? "Xem kết quả" : "Thẻ tiếp theo →"}
                  </button>
                </div>
              )}
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
