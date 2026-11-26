"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookA,
  Copy,
  GitBranch,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Shuffle,
  Trash2,
  Volume2,
  X,
  Zap,
} from "lucide-react";

interface VocabEntry {
  id: string;
  word: string;
  meaning: string;
  example: string;
  status: "Mới" | "Đang nhớ" | "Đã thuộc";
}

const VOCAB_KEY = "kronoflow-vocab-v1";

export function MindReadVocabModal({
  open,
  onClose,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const [tab, setTab] = useState<"rsvp" | "vocab" | "tree" | "picker">("rsvp");

  // 1. RSVP Speed Reading
  const [rsvpText, setRsvpText] = useState(
    "KronoFlow giúp bạn luyện tốc độ đọc lướt tài liệu ôn thi bằng kỹ thuật hiển thị từng từ tại điểm tập trung trung tâm. Hãy dán đoạn giáo trình cần ôn vào ô bên dưới và chọn tốc độ phù hợp."
  );
  const [wpm, setWpm] = useState(320);
  const [rsvpPlaying, setRsvpPlaying] = useState(false);
  const [rsvpIdx, setRsvpIdx] = useState(0);

  // 2. Vocabulary Vault
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [vWord, setVWord] = useState("");
  const [vMeaning, setVMeaning] = useState("");
  const [vExample, setVExample] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // 3. Quick Tree Outliner
  const [treeRaw, setTreeRaw] = useState(
    "Cấu trúc dữ liệu\n  Cấu trúc tuyến tính\n    Mảng (Array)\n    Danh sách liên kết\n    Ngăn xếp & Hàng đợi\n  Cấu trúc phi tuyến\n    Cây nhị phân tìm kiếm (BST)\n    Đồ thị (BFS / DFS)"
  );

  // 4. Random Picker & Group Shuffler
  const [poolRaw, setPoolRaw] = useState("Câu 1: Lạm phát cầu kéo\nCâu 2: Chính sách tiền tệ mở rộng\nCâu 3: Độ phức tạp Quick Sort\nCâu 4: Tính đa hình trong OOP");
  const [pickedItem, setPickedItem] = useState<string | null>(null);
  const [groupCount, setGroupCount] = useState(2);
  const [groups, setGroups] = useState<string[][]>([]);

  const rsvpWords = useMemo(
    () => rsvpText.trim().split(/\s+/).filter(Boolean),
    [rsvpText]
  );

  useEffect(() => {
    if (!open) {
      setRsvpPlaying(false);
      return;
    }
    try {
      const raw = localStorage.getItem(VOCAB_KEY);
      if (raw) setVocab(JSON.parse(raw) as VocabEntry[]);
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!rsvpPlaying || !open || tab !== "rsvp" || rsvpWords.length === 0) return;
    const ms = Math.max(80, Math.round(60000 / Math.max(100, wpm)));
    const id = setInterval(() => {
      setRsvpIdx((i) => {
        if (i + 1 >= rsvpWords.length) {
          setRsvpPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [rsvpPlaying, open, tab, wpm, rsvpWords.length]);

  const treeNodes = useMemo(() => {
    return treeRaw
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((line, i) => {
        const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0;
        const depth = Math.min(4, Math.floor(leading / 2));
        return { id: i, depth, text: line.trim().replace(/^[-*•]\s*/, "") };
      });
  }, [treeRaw]);

  if (!open) return null;

  const saveVocab = (next: VocabEntry[]) => {
    setVocab(next);
    try {
      localStorage.setItem(VOCAB_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const speakWord = (w: string) => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(w);
        utt.lang = "en-US";
        window.speechSynthesis.speak(utt);
      }
    } catch {
      // ignore
    }
  };

  const pushToFlashcard = async (item: VocabEntry) => {
    setSyncingId(item.id);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: item.word.slice(0, 400),
          back: `${item.meaning}${item.example ? ` — VD: ${item.example}` : ""}`.slice(0, 1000),
          subjectId: null,
        }),
      });
      if (res.ok) {
        onRefresh?.();
        window.alert(`Đã đẩy từ "${item.word}" sang bộ Flashcards!`);
      }
    } finally {
      setSyncingId(null);
    }
  };

  const curWord = rsvpWords[rsvpIdx] ?? "";
  const pivot = Math.floor(curWord.length / 2);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Đọc nhanh RSVP, Sổ Từ vựng, Sơ đồ Cây & Bốc thăm Ngẫu nhiên
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

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          {(
            [
              ["rsvp", "Đọc nhanh RSVP", Zap],
              ["vocab", "Sổ Từ vựng", BookA],
              ["tree", "Sơ đồ Cây", GitBranch],
              ["picker", "Bốc thăm & Chia nhóm", Shuffle],
            ] as const
          ).map(([k, lbl, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                tab === k
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {lbl}
            </button>
          ))}
        </div>

        {/* TAB 1: RSVP SPEED READING */}
        {tab === "rsvp" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-[#0b1020] py-10 text-center">
              <div className="font-mono text-3xl font-bold tracking-wide text-slate-100 sm:text-4xl">
                <span>{curWord.slice(0, pivot)}</span>
                <span className="text-rose-400">{curWord.slice(pivot, pivot + 1)}</span>
                <span>{curWord.slice(pivot + 1)}</span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                Từ {Math.min(rsvpIdx + 1, rsvpWords.length)} / {rsvpWords.length} · {wpm} từ/phút
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <label className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Tốc độ (WPM):</span>
                <input
                  type="range"
                  min={180}
                  max={600}
                  step={20}
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  className="w-32 accent-[var(--accent)]"
                />
                <strong className="font-mono text-[var(--accent)]">{wpm}</strong>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (rsvpIdx + 1 >= rsvpWords.length) setRsvpIdx(0);
                    setRsvpPlaying((v) => !v);
                  }}
                  className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium"
                >
                  {rsvpPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {rsvpPlaying ? "Tạm dừng" : "Đọc ngay"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRsvpPlaying(false);
                    setRsvpIdx(0);
                  }}
                  className="rounded-lg border border-[var(--border-subtle)] p-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={rsvpText}
              onChange={(e) => {
                setRsvpText(e.target.value);
                setRsvpIdx(0);
              }}
              placeholder="Dán đoạn tài liệu muốn luyện đọc nhanh vào đây..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
            />
          </div>
        )}

        {/* TAB 2: VOCABULARY VAULT */}
        {tab === "vocab" && (
          <div className="mt-4 space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!vWord.trim() || !vMeaning.trim()) return;
                saveVocab([
                  {
                    id: `vb-${Date.now()}`,
                    word: vWord.trim(),
                    meaning: vMeaning.trim(),
                    example: vExample.trim(),
                    status: "Mới",
                  },
                  ...vocab,
                ]);
                setVWord("");
                setVMeaning("");
                setVExample("");
              }}
              className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-3"
            >
              <input
                type="text"
                required
                value={vWord}
                onChange={(e) => setVWord(e.target.value)}
                placeholder="Từ mới / Thuật ngữ..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                required
                value={vMeaning}
                onChange={(e) => setVMeaning(e.target.value)}
                placeholder="Nghĩa tiếng Việt..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={vExample}
                onChange={(e) => setVExample(e.target.value)}
                placeholder="Câu ví dụ (tùy chọn)..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 font-medium sm:col-span-3"
              >
                <Plus className="h-3.5 w-3.5" /> Lưu vào Sổ từ vựng
              </button>
            </form>

            <div className="space-y-2">
              {vocab.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[var(--accent)]">{v.word}</strong>
                      <button
                        type="button"
                        onClick={() => speakWord(v.word)}
                        title="Nghe phát âm"
                        className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-[var(--text-primary)]">{v.meaning}</div>
                    {v.example && <div className="text-[11px] italic text-[var(--text-muted)]">{v.example}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={syncingId === v.id}
                      onClick={() => pushToFlashcard(v)}
                      title="Đẩy thành thẻ Flashcard"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-medium text-[var(--accent)]"
                    >
                      <Send className="h-3 w-3" /> {syncingId === v.id ? "..." : "Flashcard"}
                    </button>
                    <button
                      type="button"
                      onClick={() => saveVocab(vocab.filter((x) => x.id !== v.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: QUICK TREE OUTLINER */}
        {tab === "tree" && (
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Nhập dàn ý (thụt lề 2 dấu cách cho nhánh con):</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(treeRaw).catch(() => {});
                    window.alert("Đã sao chép dàn ý!");
                  }}
                  className="inline-flex items-center gap-1 text-[var(--accent)]"
                >
                  <Copy className="h-3 w-3" /> Chép
                </button>
              </div>
              <textarea
                rows={10}
                value={treeRaw}
                onChange={(e) => setTreeRaw(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 font-mono text-[11px]"
              />
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="mb-2 text-[11px] font-semibold text-[var(--text-muted)]">
                Xem trước Sơ đồ nhánh cây
              </div>
              <div className="space-y-1.5">
                {treeNodes.map((n) => (
                  <div
                    key={n.id}
                    style={{ marginLeft: `${n.depth * 18}px` }}
                    className={`rounded-lg border px-2.5 py-1.5 ${
                      n.depth === 0
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] font-bold text-[var(--accent)]"
                        : n.depth === 1
                        ? "border-sky-500/35 bg-sky-500/10 font-semibold text-[var(--text-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {n.depth > 0 && <span className="mr-1 text-[var(--text-muted)]">↳</span>}
                    {n.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RANDOM PICKER & GROUP SHUFFLER */}
        {tab === "picker" && (
          <div className="mt-4 space-y-3 text-xs">
            <textarea
              rows={5}
              value={poolRaw}
              onChange={(e) => setPoolRaw(e.target.value)}
              placeholder="Nhập mỗi câu hỏi hoặc tên thành viên trên 1 dòng..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const items = poolRaw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
                  if (items.length === 0) return;
                  setPickedItem(items[Math.floor(Math.random() * items.length)] ?? null);
                }}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-medium"
              >
                <Shuffle className="h-3.5 w-3.5" /> Bốc ngẫu nhiên 1 mục
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={groupCount}
                  onChange={(e) => setGroupCount(Math.min(8, Math.max(2, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const items = poolRaw
                      .split(/\r?\n/)
                      .map((x) => x.trim())
                      .filter(Boolean)
                      .sort(() => Math.random() - 0.5);
                    const buckets: string[][] = Array.from({ length: groupCount }, () => []);
                    items.forEach((it, idx) => {
                      buckets[idx % groupCount]?.push(it);
                    });
                    setGroups(buckets);
                  }}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 font-medium hover:border-[var(--accent)]"
                >
                  Chia thành {groupCount} nhóm
                </button>
              </div>
            </div>

            {pickedItem && (
              <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3.5 text-center">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">Kết quả bốc thăm</div>
                <div className="mt-1 text-sm font-bold text-[var(--accent)]">{pickedItem}</div>
              </div>
            )}

            {groups.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {groups.map((grp, gi) => (
                  <div key={gi} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                    <div className="font-semibold text-[var(--accent)]">Nhóm {gi + 1} ({grp.length})</div>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--text-primary)]">
                      {grp.map((m, mi) => (
                        <li key={mi}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
