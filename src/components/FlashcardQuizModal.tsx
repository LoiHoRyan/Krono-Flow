"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, History, RotateCcw, Trophy, X, XCircle } from "lucide-react";

interface QuizCardInput {
  id: string;
  front: string;
  back: string;
}

interface QuizHistoryEntry {
  id: string;
  date: string;
  score: number;
  total: number;
  pct: number;
  timedMins: number;
}

const QUIZ_HISTORY_KEY = "kronoflow-quiz-history-v1";

export function FlashcardQuizModal({
  open,
  onClose,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  cards: QuizCardInput[];
}) {
  const [seed, setSeed] = useState(0);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrongList, setWrongList] = useState<QuizCardInput[]>([]);
  const [timeLimitMins, setTimeLimitMins] = useState<number>(0); // 0 = unlimited
  const [secsLeft, setSecsLeft] = useState<number>(0);
  const [timedOut, setTimedOut] = useState(false);
  const [history, setHistory] = useState<QuizHistoryEntry[]>([]);
  const [savedAttempt, setSavedAttempt] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUIZ_HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as QuizHistoryEntry[]);
    } catch {
      // ignore
    }
  }, []);

  const questions = useMemo(() => {
    if (!open || cards.length < 2) return [];
    const shuffled = [...cards].sort((a, b) => {
      const ha = (a.id.charCodeAt(0) + seed * 31) % 97;
      const hb = (b.id.charCodeAt(0) + seed * 31) % 97;
      return ha - hb;
    });
    return shuffled.slice(0, 15).map((card) => {
      const distractors = cards
        .filter((c) => c.id !== card.id && c.back !== card.back)
        .sort((a, b) => ((a.front.length + seed) % 7) - ((b.front.length + seed) % 7))
        .slice(0, 3)
        .map((c) => c.back);
      const options = [card.back, ...distractors].sort((a, b) => a.localeCompare(b));
      return { card, options };
    });
  }, [open, cards, seed]);

  const finished = (questions.length > 0 && idx >= questions.length) || timedOut;

  useEffect(() => {
    if (!open || timeLimitMins <= 0 || finished || questions.length === 0) return;
    const id = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, timeLimitMins, finished, questions.length]);

  useEffect(() => {
    if (!finished || savedAttempt || questions.length === 0) return;
    setSavedAttempt(true);
    const entry: QuizHistoryEntry = {
      id: `${Date.now()}`,
      date: new Date().toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      score,
      total: questions.length,
      pct: Math.round((score / questions.length) * 100),
      timedMins: timeLimitMins,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      try {
        localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [finished, savedAttempt, questions.length, score, timeLimitMins]);

  if (!open) return null;

  const resetQuiz = (nextMins = timeLimitMins) => {
    setSeed((s) => s + 1);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setWrongList([]);
    setTimedOut(false);
    setSavedAttempt(false);
    setTimeLimitMins(nextMins);
    setSecsLeft(nextMins * 60);
  };

  const cur = questions[idx] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Thi thử Trắc nghiệm A/B/C/D
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={timeLimitMins}
              onChange={(e) => resetQuiz(Number(e.target.value))}
              title="Chọn chế độ bấm giờ thi thử"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px] text-[var(--text-primary)]"
            >
              <option value={0}>Không giới hạn giờ</option>
              <option value={5}>Bấm giờ 5 phút</option>
              <option value={10}>Bấm giờ 10 phút</option>
              <option value={15}>Bấm giờ 15 phút</option>
            </select>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {cards.length < 2 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">
            Cần ít nhất 2 thẻ Flashcard để tạo đề trắc nghiệm tự động.
          </p>
        ) : finished ? (
          <div className="space-y-4 py-4 text-center">
            {timedOut && (
              <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold text-rose-500">
                <Clock className="h-3.5 w-3.5" /> Hết giờ làm bài — hệ thống đã tự nộp!
              </div>
            )}
            <div className="font-mono text-3xl font-bold text-[var(--accent)]">
              {score} / {questions.length}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Độ chính xác: <strong>{Math.round((score / questions.length) * 100)}%</strong>
            </p>
            {wrongList.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-left text-xs">
                <div className="font-semibold text-rose-500">Câu cần xem lại ({wrongList.length}):</div>
                {wrongList.map((w) => (
                  <div key={w.id} className="border-b border-[var(--border-subtle)] pb-1 last:border-0">
                    <div className="font-medium text-[var(--text-primary)]">{w.front}</div>
                    <div className="text-[11px] text-emerald-600">→ {w.back}</div>
                  </div>
                ))}
              </div>
            )}
            {history.length > 0 && (
              <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-left text-[11px]">
                <div className="flex items-center gap-1 font-semibold text-[var(--text-muted)]">
                  <History className="h-3.5 w-3.5" /> Lịch sử thi thử gần đây
                </div>
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span>
                      {h.date} {h.timedMins > 0 ? `(${h.timedMins}p)` : "(Tự do)"}
                    </span>
                    <strong className="font-mono text-[var(--accent)]">
                      {h.score}/{h.total} ({h.pct}%)
                    </strong>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => resetQuiz(timeLimitMins)}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Làm lượt mới
            </button>
          </div>
        ) : cur ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>
                Câu {idx + 1} / {questions.length}
              </span>
              <div className="flex items-center gap-3">
                {timeLimitMins > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 font-mono font-semibold ${
                      secsLeft <= 60 ? "animate-pulse text-rose-500" : "text-amber-600"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {String(Math.floor(secsLeft / 60)).padStart(2, "0")}:
                    {String(secsLeft % 60).padStart(2, "0")}
                  </span>
                )}
                <span className="font-mono font-semibold text-emerald-600">Đúng: {score}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-sm font-medium text-[var(--text-primary)]">
              {cur.card.front}
            </div>

            <div className="space-y-2">
              {cur.options.map((opt, oi) => {
                const letter = ["A", "B", "C", "D"][oi] ?? "A";
                const isRight = opt === cur.card.back;
                const isSelected = picked === opt;
                let cls =
                  "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--accent)]";
                if (picked) {
                  if (isRight)
                    cls = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
                  else if (isSelected) cls = "border-rose-500 bg-rose-500/15 text-rose-600";
                }
                return (
                  <button
                    key={`${oi}-${opt.slice(0, 20)}`}
                    type="button"
                    disabled={Boolean(picked)}
                    onClick={() => {
                      setPicked(opt);
                      if (isRight) setScore((s) => s + 1);
                      else setWrongList((w) => [...w, cur.card]);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition ${cls}`}
                  >
                    <span>
                      <strong className="mr-1.5 font-mono">{letter}.</strong> {opt}
                    </span>
                    {picked && isRight && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                    {picked && isSelected && !isRight && (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {picked && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                    setIdx((i) => i + 1);
                  }}
                  className="btn-primary rounded-xl px-4 py-1.5 text-xs font-medium"
                >
                  {idx + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp theo →"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
