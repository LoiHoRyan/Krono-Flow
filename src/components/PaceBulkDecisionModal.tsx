"use client";

import { useMemo, useState } from "react";
import {
  Gauge,
  Layers,
  Plus,
  Scale,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { kfNotify } from "@/lib/notify";
import type { SubjectRecord } from "./SubjectTodoPanel";

interface DecisionCriterion {
  id: string;
  label: string;
  weight: number;
  scoreA: number;
  scoreB: number;
  scoreC: number;
}

const DEFAULT_CRITERIA: DecisionCriterion[] = [
  { id: "c1", label: "Tính thực tế / dễ triển khai", weight: 5, scoreA: 8, scoreB: 6, scoreC: 7 },
  { id: "c2", label: "Tiết kiệm thời gian / chi phí", weight: 4, scoreA: 7, scoreB: 8, scoreC: 6 },
  { id: "c3", label: "Giá trị điểm số / dài hạn", weight: 5, scoreA: 9, scoreB: 7, scoreC: 8 },
];

export function PaceBulkDecisionModal({
  open,
  onClose,
  subjects,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectRecord[];
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"pace" | "bulk" | "decision">("pace");

  // TAB 1: Reading & Video Speed Planner
  const [videoHours, setVideoHours] = useState(12);
  const [playSpeed, setPlaySpeed] = useState(1.5);
  const [dailyVideoHours, setDailyVideoHours] = useState(1.5);

  const [totalPages, setTotalPages] = useState(180);
  const [pagesPerHour, setPagesPerHour] = useState(20);
  const [dailyReadHours, setDailyReadHours] = useState(1.5);

  const effectiveVideoHours = videoHours / Math.max(0.5, playSpeed);
  const savedVideoHours = Math.max(0, videoHours - effectiveVideoHours);
  const videoDays = Math.ceil(effectiveVideoHours / Math.max(0.25, dailyVideoHours));

  const totalReadHours = totalPages / Math.max(1, pagesPerHour);
  const readDays = Math.ceil(totalReadHours / Math.max(0.25, dailyReadHours));
  const dailyPages = Math.ceil(totalPages / Math.max(1, readDays));

  // TAB 2: Instant Bulk Flashcard Creator -> POST /api/flashcards
  const [bulkRaw, setBulkRaw] = useState("");
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedCards = useMemo(() => {
    const out: { front: string; back: string }[] = [];
    for (const line of bulkRaw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let sepIdx = trimmed.indexOf("::");
      let sepLen = 2;
      if (sepIdx === -1) {
        sepIdx = trimmed.indexOf(" - ");
        sepLen = 3;
      }
      if (sepIdx === -1) {
        sepIdx = trimmed.indexOf("\t");
        sepLen = 1;
      }
      if (sepIdx > 0) {
        const front = trimmed.slice(0, sepIdx).trim();
        const back = trimmed.slice(sepIdx + sepLen).trim();
        if (front && back) out.push({ front, back });
      }
    }
    return out;
  }, [bulkRaw]);

  const handleBulkSave = async () => {
    if (parsedCards.length === 0) return;
    setSubmitting(true);
    let ok = 0;
    try {
      for (const card of parsedCards.slice(0, 40)) {
        const res = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: card.front,
            back: card.back,
            subjectId: bulkSubjectId || null,
          }),
        });
        if (res.ok) ok++;
      }
      kfNotify(`Đã tạo nhanh ${ok}/${Math.min(40, parsedCards.length)} thẻ Flashcard vào PostgreSQL!`);
      if (ok > 0) {
        setBulkRaw("");
        onRefresh();
      }
    } catch {
      kfNotify("Lỗi kết nối khi lưu thẻ Flashcard.", "warn");
    } finally {
      setSubmitting(false);
    }
  };

  // TAB 3: Weighted Decision Matrix
  const [optA, setOptA] = useState("Phương án A");
  const [optB, setOptB] = useState("Phương án B");
  const [optC, setOptC] = useState("Phương án C");
  const [criteria, setCriteria] = useState<DecisionCriterion[]>(DEFAULT_CRITERIA);

  const totals = useMemo(() => {
    const a = criteria.reduce((acc, c) => acc + c.weight * c.scoreA, 0);
    const b = criteria.reduce((acc, c) => acc + c.weight * c.scoreB, 0);
    const c = criteria.reduce((acc, c2) => acc + c2.weight * c2.scoreC, 0);
    const ranked = [
      { name: optA || "A", score: a },
      { name: optB || "B", score: b },
      { name: optC || "C", score: c },
    ].sort((x, y) => y.score - x.score);
    return { a, b, c, winner: ranked[0] };
  }, [criteria, optA, optB, optC]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Tốc độ Học · Tạo Flashcard Nhanh · So sánh Trọng số</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Tính ngày xong video/giáo trình, dán tạo hàng loạt thẻ Flashcard và chấm điểm chọn phương án
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--bg-elevated)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("pace")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "pace" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Gauge className="h-3.5 w-3.5" /> Tốc độ học
          </button>
          <button
            type="button"
            onClick={() => setTab("bulk")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "bulk" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Tạo thẻ nhanh
          </button>
          <button
            type="button"
            onClick={() => setTab("decision")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "decision" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Scale className="h-3.5 w-3.5" /> So sánh trọng số
          </button>
        </div>

        {/* TAB 1: READING & VIDEO SPEED PLANNER */}
        {tab === "pace" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 text-xs">
              <p className="font-bold text-[var(--accent)]">1. Kế hoạch xem Video Bài giảng</p>
              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">Tổng số giờ video (giờ)</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={videoHours}
                  onChange={(e) => setVideoHours(Math.max(0.5, Number(e.target.value) || 0.5))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <div>
                <span className="text-[11px] text-[var(--text-muted)]">Tốc độ phát</span>
                <div className="mt-1 flex gap-1">
                  {[1, 1.25, 1.5, 1.75, 2].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setPlaySpeed(sp)}
                      className={`flex-1 rounded-lg py-1 font-mono text-[11px] font-bold ${
                        playSpeed === sp
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">Thời gian xem mỗi ngày (giờ)</span>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={dailyVideoHours}
                  onChange={(e) => setDailyVideoHours(Math.max(0.25, Number(e.target.value) || 0.5))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <div className="rounded-xl bg-[var(--bg-surface)] p-2.5 text-[11px] leading-relaxed">
                <p>Thời lượng thực tế: <strong className="font-mono text-[var(--accent)]">{effectiveVideoHours.toFixed(1)} giờ</strong> (tiết kiệm {savedVideoHours.toFixed(1)}g)</p>
                <p>Hoàn thành sau: <strong className="font-mono text-emerald-600">{videoDays} ngày</strong></p>
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5 text-xs">
              <p className="font-bold text-[var(--accent)]">2. Kế hoạch đọc Giáo trình / PDF</p>
              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">Tổng số trang cần đọc</span>
                <input
                  type="number"
                  min={1}
                  value={totalPages}
                  onChange={(e) => setTotalPages(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">Tốc độ đọc hiểu (trang / giờ)</span>
                <input
                  type="number"
                  min={1}
                  value={pagesPerHour}
                  onChange={(e) => setPagesPerHour(Math.max(1, Number(e.target.value) || 10))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-[var(--text-muted)]">Thời gian đọc mỗi ngày (giờ)</span>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={dailyReadHours}
                  onChange={(e) => setDailyReadHours(Math.max(0.25, Number(e.target.value) || 0.5))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <div className="rounded-xl bg-[var(--bg-surface)] p-2.5 text-[11px] leading-relaxed">
                <p>Tổng thời gian đọc: <strong className="font-mono text-[var(--accent)]">{totalReadHours.toFixed(1)} giờ</strong></p>
                <p>Cần <strong className="font-mono text-emerald-600">{readDays} ngày</strong> (~<strong>{dailyPages} trang/ngày</strong>)</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSTANT BULK FLASHCARD CREATOR */}
        {tab === "bulk" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <select
                value={bulkSubjectId}
                onChange={(e) => setBulkSubjectId(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold outline-none"
              >
                <option value="">Không gắn môn học</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleBulkSave()}
                disabled={submitting || parsedCards.length === 0}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Đang lưu..." : `Tạo ${Math.min(40, parsedCards.length)} thẻ vào DB`}
              </button>
            </div>

            <textarea
              rows={6}
              value={bulkRaw}
              onChange={(e) => setBulkRaw(e.target.value)}
              placeholder={"Mỗi dòng 1 thẻ dạng Mặt trước :: Mặt sau (hoặc dùng dấu ' - '):\nLạm phát cầu kéo :: Xảy ra khi tổng cầu tăng vượt quá tổng cung\nBig-O của Binary Search :: O(log n)"}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 font-mono text-xs outline-none focus:border-[var(--accent)]"
            />

            {parsedCards.length > 0 && (
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-2.5 text-xs">
                <p className="text-[10px] font-bold uppercase text-[var(--accent)]">
                  Xem trước ({parsedCards.length} thẻ nhận diện được)
                </p>
                {parsedCards.slice(0, 8).map((c, idx) => (
                  <div key={idx} className="flex gap-2 border-b border-[var(--border-subtle)]/60 py-1 last:border-0">
                    <span className="font-semibold text-[var(--text-primary)]">{c.front}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className="truncate text-[var(--text-secondary)]">{c.back}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WEIGHTED DECISION MATRIX */}
        {tab === "decision" && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <input value={optA} onChange={(e) => setOptA(e.target.value)} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-bold outline-none" />
              <input value={optB} onChange={(e) => setOptB(e.target.value)} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-bold outline-none" />
              <input value={optC} onChange={(e) => setOptC(e.target.value)} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-bold outline-none" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-2.5 py-2">Tiêu chí</th>
                    <th className="px-2 py-2 text-center">Trọng số (1-5)</th>
                    <th className="px-2 py-2 text-center">{optA}</th>
                    <th className="px-2 py-2 text-center">{optB}</th>
                    <th className="px-2 py-2 text-center">{optC}</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {criteria.map((cr) => (
                    <tr key={cr.id}>
                      <td className="px-2 py-1.5">
                        <input
                          value={cr.label}
                          onChange={(e) =>
                            setCriteria((prev) => prev.map((x) => (x.id === cr.id ? { ...x, label: e.target.value } : x)))
                          }
                          className="w-full rounded bg-transparent px-1 py-0.5 outline-none focus:bg-[var(--bg-elevated)]"
                        />
                      </td>
                      {(["weight", "scoreA", "scoreB", "scoreC"] as const).map((field) => (
                        <td key={field} className="px-1.5 py-1.5 text-center">
                          <input
                            type="number"
                            min={1}
                            max={field === "weight" ? 5 : 10}
                            value={cr[field]}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(field === "weight" ? 5 : 10, Number(e.target.value) || 1));
                              setCriteria((prev) => prev.map((x) => (x.id === cr.id ? { ...x, [field]: v } : x)));
                            }}
                            className="w-12 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-0.5 text-center font-mono font-bold outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-1.5 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setCriteria((prev) => prev.filter((x) => x.id !== cr.id))}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setCriteria((prev) => [
                    ...prev,
                    { id: `c-${Date.now()}`, label: "Tiêu chí mới", weight: 3, scoreA: 7, scoreB: 7, scoreC: 7 },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm tiêu chí
              </button>
              <div className="rounded-xl bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                Tối ưu nhất: {totals.winner?.name} ({totals.winner?.score} điểm) · ({optA}: {totals.a} | {optB}: {totals.b} | {optC}: {totals.c})
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
