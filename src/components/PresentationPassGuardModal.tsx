"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Presentation,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { kfNotify } from "@/lib/notify";

interface SlideSegment {
  id: string;
  title: string;
  seconds: number;
  cue: string;
}

const DEFAULT_SEGMENTS: SlideSegment[] = [
  { id: "seg-1", title: "Mở đầu & Đặt vấn đề", seconds: 60, cue: "Chào hội đồng, nêu lý do chọn đề tài và mục tiêu chính." },
  { id: "seg-2", title: "Nội dung chính & Demo", seconds: 300, cue: "Trình bày giải pháp, số liệu minh chứng và điểm nổi bật." },
  { id: "seg-3", title: "Kết luận & Hỏi đáp (Q&A)", seconds: 120, cue: "Tóm tắt 3 ý cốt lõi, cảm ơn và mời đặt câu hỏi." },
];

function fmtSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function PresentationPassGuardModal({
  open,
  onClose,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"rehearsal" | "passguard" | "voice">("rehearsal");

  // TAB 1: Presentation Rehearsal Timer + Cue Cards
  const [segments, setSegments] = useState<SlideSegment[]>(DEFAULT_SEGMENTS);
  const [segIdx, setSegIdx] = useState(0);
  const [secsLeft, setSecsLeft] = useState(DEFAULT_SEGMENTS[0]?.seconds ?? 60);
  const [running, setRunning] = useState(false);

  const activeSeg = segments[segIdx] ?? segments[0] ?? null;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          if (segIdx + 1 < segments.length) {
            const next = segments[segIdx + 1];
            setSegIdx(segIdx + 1);
            kfNotify(`Chuyển sang phần: ${next?.title ?? "Tiếp theo"}`, "info");
            return next?.seconds ?? 60;
          }
          setRunning(false);
          kfNotify("Hoàn thành bài tập thuyết trình!", "success");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, segIdx, segments]);

  const selectSegment = (idx: number) => {
    setRunning(false);
    setSegIdx(idx);
    setSecsLeft(segments[idx]?.seconds ?? 60);
  };

  // TAB 2: Pass-Risk & Attendance Guard
  const [totalSessions, setTotalSessions] = useState(15);
  const [missedSessions, setMissedSessions] = useState(1);
  const [maxAbsencePct, setMaxAbsencePct] = useState(20);
  const [processScore, setProcessScore] = useState(7.5);
  const [finalWeightPct, setFinalWeightPct] = useState(50);

  const maxAllowedMissed = Math.floor((Math.max(1, totalSessions) * maxAbsencePct) / 100);
  const remainingSafeAbsences = maxAllowedMissed - missedSessions;
  const finalW = Math.max(0.1, Math.min(0.9, finalWeightPct / 100));
  const procW = 1 - finalW;

  const targets = [
    { label: "Qua môn (D — 4.0)", target: 4.0 },
    { label: "Khá (B — 7.0)", target: 7.0 },
    { label: "Khá Giỏi (B+ — 8.0)", target: 8.0 },
    { label: "Giỏi (A — 8.5)", target: 8.5 },
    { label: "Xuất sắc (A+ — 9.0)", target: 9.0 },
  ];

  // TAB 3: Vietnamese Voice-to-Note Dictation
  const [voiceLang, setVoiceLang] = useState<"vi-VN" | "en-US">("vi-VN");
  const [listening, setListening] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const toggleVoice = () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };

    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      kfNotify("Trình duyệt hiện tại chưa hỗ trợ đọc chính tả (hãy dùng Chrome hoặc Edge).", "warn");
      return;
    }

    const rec = new SR();
    rec.lang = voiceLang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const chunk = e.results[i]?.[0]?.transcript;
        if (chunk) parts.push(chunk.trim());
      }
      if (parts.length > 0) {
        setTranscript((prev) => `${prev ? prev + " " : ""}${parts[parts.length - 1] ?? ""}`.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleSaveVoiceNote = async () => {
    if (!transcript.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle.trim() || `Ghi chú giọng nói ${new Date().toLocaleDateString("vi-VN")}`,
          content: transcript.trim(),
        }),
      });
      if (res.ok) {
        kfNotify("Đã lưu bản ghi giọng nói vào mục Ghi chú!");
        setNoteTitle("");
        setTranscript("");
        onRefresh();
      } else {
        kfNotify("Không thể lưu ghi chú lúc này.", "warn");
      }
    } catch {
      kfNotify("Lỗi kết nối khi lưu ghi chú.", "warn");
    } finally {
      setSavingNote(false);
    }
  };

  if (!open) return null;

  const pctLeft = activeSeg && activeSeg.seconds > 0 ? Math.round((secsLeft / activeSeg.seconds) * 100) : 0;
  const barColor =
    pctLeft <= 10 ? "bg-rose-500" : pctLeft <= 25 ? "bg-amber-500" : "bg-[var(--accent)]";

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
              <Presentation className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Tập Thuyết Trình · Chống Rớt Môn · Đọc chính tả</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Chia chặng slide kèm thẻ dẫn, tính điểm tối thiểu cuối kỳ & ghi chú bằng giọng nói vi-VN
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
            onClick={() => setTab("rehearsal")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "rehearsal" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Presentation className="h-3.5 w-3.5" /> Thuyết trình
          </button>
          <button
            type="button"
            onClick={() => setTab("passguard")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "passguard" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Chống rớt môn
          </button>
          <button
            type="button"
            onClick={() => setTab("voice")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "voice" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Mic className="h-3.5 w-3.5" /> Đọc chính tả
          </button>
        </div>

        {/* TAB 1: PRESENTATION REHEARSAL */}
        {tab === "rehearsal" && (
          <div className="space-y-3">
            {activeSeg && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-[var(--accent)]">
                      Phần {segIdx + 1}/{segments.length}: {activeSeg.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{activeSeg.cue}</p>
                  </div>
                  <span className="font-mono text-3xl font-extrabold tabular-nums text-[var(--text-primary)]">
                    {fmtSec(secsLeft)}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                  <div className={`h-full transition-all duration-300 ${barColor}`} style={{ width: `${pctLeft}%` }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRunning((v) => !v)}
                    className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold"
                  >
                    {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {running ? "Tạm dừng" : "Bắt đầu chạy thử"}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectSegment(segIdx)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Đặt lại chặng này"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSegments((prev) => [
                        ...prev,
                        { id: `seg-${Date.now()}`, title: `Phần ${prev.length + 1}`, seconds: 90, cue: "Ý chính cần nói..." },
                      ])
                    }
                    className="ml-auto inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm chặng
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {segments.map((seg, i) => (
                <div
                  key={seg.id}
                  className={`rounded-xl border p-2.5 text-xs ${
                    i === segIdx
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/30"
                      : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectSegment(i)}
                      className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      Chọn #{i + 1}
                    </button>
                    <input
                      value={seg.title}
                      onChange={(e) =>
                        setSegments((prev) => prev.map((x) => (x.id === seg.id ? { ...x, title: e.target.value } : x)))
                      }
                      className="min-w-[140px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-semibold outline-none"
                    />
                    <input
                      type="number"
                      min={10}
                      max={3600}
                      value={seg.seconds}
                      onChange={(e) => {
                        const sec = Math.max(10, Number(e.target.value) || 60);
                        setSegments((prev) => prev.map((x) => (x.id === seg.id ? { ...x, seconds: sec } : x)));
                        if (i === segIdx && !running) setSecsLeft(sec);
                      }}
                      className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] text-[var(--text-muted)]">giây</span>
                    {segments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = segments.filter((x) => x.id !== seg.id);
                          setSegments(next);
                          if (segIdx >= next.length) setSegIdx(Math.max(0, next.length - 1));
                        }}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    value={seg.cue}
                    onChange={(e) =>
                      setSegments((prev) => prev.map((x) => (x.id === seg.id ? { ...x, cue: e.target.value } : x)))
                    }
                    placeholder="Ghi chú thẻ dẫn (Cue Card)..."
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PASS-RISK & ATTENDANCE GUARD */}
        {tab === "passguard" && (
          <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">Tổng số buổi học</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">Số buổi đã nghỉ</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={missedSessions}
                  onChange={(e) => setMissedSessions(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">Trần nghỉ tối đa (%)</span>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={maxAbsencePct}
                  onChange={(e) => setMaxAbsencePct(Math.max(5, Math.min(50, Number(e.target.value) || 20)))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
            </div>

            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                remainingSafeAbsences < 0
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                  : remainingSafeAbsences === 0
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {remainingSafeAbsences < 0
                ? `Cảnh báo cấm thi! Bạn đã nghỉ vượt trần ${Math.abs(remainingSafeAbsences)} buổi (tối đa ${maxAllowedMissed} buổi).`
                : remainingSafeAbsences === 0
                ? `Đã chạm trần tối đa (${maxAllowedMissed} buổi) — tuyệt đối không nghỉ thêm buổi nào!`
                : `An toàn: Còn được phép nghỉ tối đa ${remainingSafeAbsences} buổi nữa (trần ${maxAllowedMissed}/${totalSessions} buổi).`}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">Điểm quá trình hiện tại (hệ 10)</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={processScore}
                  onChange={(e) => setProcessScore(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-xs">
                <span className="text-[11px] text-[var(--text-muted)]">Trọng số thi cuối kỳ (%)</span>
                <input
                  type="number"
                  step={5}
                  min={10}
                  max={90}
                  value={finalWeightPct}
                  onChange={(e) => setFinalWeightPct(Math.max(10, Math.min(90, Number(e.target.value) || 50)))}
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold outline-none"
                />
              </label>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-elevated)] text-[11px] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2">Mục tiêu tổng kết</th>
                    <th className="px-3 py-2">Điểm cuối kỳ cần đạt</th>
                    <th className="px-3 py-2">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {targets.map((row) => {
                    const needed = (row.target - processScore * procW) / finalW;
                    const possible = needed <= 10;
                    const alreadyMet = needed <= 0;
                    return (
                      <tr key={row.label}>
                        <td className="px-3 py-2 font-semibold">{row.label}</td>
                        <td className="px-3 py-2 font-mono font-bold">
                          {alreadyMet ? "0.0" : possible ? needed.toFixed(2) : `${needed.toFixed(2)} (>10)`}
                        </td>
                        <td className="px-3 py-2">
                          {alreadyMet ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              Chắc chắn đạt
                            </span>
                          ) : possible ? (
                            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                              Khả thi
                            </span>
                          ) : (
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                              Vượt trần 10đ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: VIETNAMESE VOICE-TO-NOTE DICTATION */}
        {tab === "voice" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow ${
                    listening ? "bg-rose-600 animate-pulse" : "btn-primary"
                  }`}
                >
                  {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {listening ? "Đang nghe... (Bấm để dừng)" : "Bắt đầu đọc chính tả"}
                </button>
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value as "vi-VN" | "en-US")}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-2 text-xs font-semibold outline-none"
                >
                  <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                  <option value="en-US">English (en-US)</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(transcript).catch(() => {});
                    kfNotify("Đã sao chép đoạn văn bản!");
                  }}
                  disabled={!transcript.trim()}
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Chép
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveVoiceNote()}
                  disabled={savingNote || !transcript.trim()}
                  className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {savingNote ? "Đang lưu..." : "Lưu vào Ghi chú"}
                </button>
              </div>
            </div>

            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Tiêu đề ghi chú (tuỳ chọn)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
            />

            <textarea
              rows={7}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Bấm nút Bắt đầu đọc chính tả ở trên rồi nói rõ ràng... Văn bản sẽ tự hiện ở đây và bạn có thể chỉnh sửa trước khi lưu thẳng vào Ghi chú."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs leading-relaxed outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
