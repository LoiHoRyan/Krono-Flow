"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Copy,
  MoonStar,
  Plus,
  Save,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { kfNotify } from "@/lib/notify";
import { getLocalDateIso } from "@/lib/utils";

interface EveningEntry {
  date: string;
  win: string;
  blocker: string;
  nextTop1: string;
}

interface CustomEventItem {
  id: string;
  title: string;
  date: string;
  color: string;
}

const EVENING_KEY = "kronoflow-evening-reflect-v1";
const COUNTDOWN_KEY = "kronoflow-custom-countdowns-v1";
const EVENT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9"];

function diffDaysLocal(targetIso: string): number {
  const today = new Date(`${getLocalDateIso()}T00:00:00`);
  const target = new Date(`${targetIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function parseTableRows(raw: string): string[][] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const first = lines[0] ?? "";
  const sep = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";
  return lines.map((line) => line.split(sep).map((c) => c.trim()));
}

export function EveningCountdownTableModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"evening" | "countdowns" | "table">("evening");

  // TAB 1: 3-Question Evening Reflection
  const todayIso = getLocalDateIso();
  const [entries, setEntries] = useState<EveningEntry[]>([]);
  const [win, setWin] = useState("");
  const [blocker, setBlocker] = useState("");
  const [nextTop1, setNextTop1] = useState("");

  // TAB 2: Custom Milestone Countdowns
  const [events, setEvents] = useState<CustomEventItem[]>([]);
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState(todayIso);
  const [evColor, setEvColor] = useState(EVENT_COLORS[0] ?? "#6366f1");

  // TAB 3: CSV/TSV <-> Markdown / JSON Converter
  const [rawInput, setRawInput] = useState(
    "Môn học,Tín chỉ,Điểm 10\nNhập môn Tài chính,3,8.5\nCấu trúc Dữ liệu,4,9.0"
  );
  const [outMode, setOutMode] = useState<"markdown" | "json">("markdown");

  useEffect(() => {
    if (!open) return;
    try {
      const rawE = localStorage.getItem(EVENING_KEY);
      if (rawE) {
        const parsed = JSON.parse(rawE) as EveningEntry[];
        if (Array.isArray(parsed)) {
          setEntries(parsed);
          const todayRec = parsed.find((x) => x.date === todayIso);
          if (todayRec) {
            setWin(todayRec.win);
            setBlocker(todayRec.blocker);
            setNextTop1(todayRec.nextTop1);
          }
        }
      }
      const rawC = localStorage.getItem(COUNTDOWN_KEY);
      if (rawC) {
        const parsedC = JSON.parse(rawC) as CustomEventItem[];
        if (Array.isArray(parsedC)) setEvents(parsedC);
      }
    } catch {
      // ignore
    }
  }, [open, todayIso]);

  const saveEvening = () => {
    if (!win.trim() && !blocker.trim() && !nextTop1.trim()) return;
    const item: EveningEntry = {
      date: todayIso,
      win: win.trim(),
      blocker: blocker.trim(),
      nextTop1: nextTop1.trim(),
    };
    const next = [item, ...entries.filter((x) => x.date !== todayIso)].slice(0, 45);
    setEntries(next);
    try {
      localStorage.setItem(EVENING_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    kfNotify(`Đã lưu phản tư cuối ngày (${todayIso})!`);
  };

  const saveEvents = (next: CustomEventItem[]) => {
    setEvents(next);
    try {
      localStorage.setItem(COUNTDOWN_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addCustomEvent = () => {
    if (!evTitle.trim() || !evDate) return;
    saveEvents([
      ...events,
      { id: `ev-${Date.now()}`, title: evTitle.trim(), date: evDate, color: evColor },
    ]);
    setEvTitle("");
    kfNotify("Đã thêm mốc đếm ngược mới!");
  };

  const convertedOutput = useMemo(() => {
    const rows = parseTableRows(rawInput);
    if (rows.length === 0) return "";
    const headers = rows[0] ?? [];
    if (outMode === "markdown") {
      const sepRow = headers.map(() => "---");
      const mdLines = [
        `| ${headers.join(" | ")} |`,
        `| ${sepRow.join(" | ")} |`,
        ...rows.slice(1).map((r) => `| ${headers.map((_, i) => r[i] ?? "").join(" | ")} |`),
      ];
      return mdLines.join("\n");
    }
    const objs = rows.slice(1).map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h || `col_${i + 1}`] = r[i] ?? "";
      });
      return obj;
    });
    return JSON.stringify(objs, null, 2);
  }, [rawInput, outMode]);

  if (!open) return null;

  const sortedEvents = [...events].sort((a, b) => diffDaysLocal(a.date) - diffDaysLocal(b.date));

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
              <Table2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Phản tư Cuối ngày · Đếm ngược Sự kiện · Đổi Bảng Nhanh</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Chốt 3 câu cuối ngày, ghim mốc bảo vệ/học bổng và chuyển CSV/Excel sang Markdown/JSON
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
            onClick={() => setTab("evening")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "evening" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <MoonStar className="h-3.5 w-3.5" /> Phản tư ngày
          </button>
          <button
            type="button"
            onClick={() => setTab("countdowns")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "countdowns" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5" /> Đếm ngược ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("table")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 font-semibold transition ${
              tab === "table" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" /> Đổi Bảng MD
          </button>
        </div>

        {/* TAB 1: EVENING 3-QUESTION REFLECTION */}
        {tab === "evening" && (
          <div className="space-y-3 text-xs">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3.5">
              <p className="font-bold text-[var(--accent)]">Phản tư hôm nay ({todayIso})</p>
              <label className="block">
                <span className="text-[11px] font-semibold">1. Điều bạn làm tốt nhất hôm nay là gì?</span>
                <input
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                  placeholder="VD: Hoàn thành trọn 3 phiên Pomodoro môn Tài chính..."
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">2. Điểm nào còn vướng / làm bạn xao nhãng?</span>
                <input
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  placeholder="VD: Chưa hiểu rõ phần tính lãi suất thực..."
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold">3. 1 việc quan trọng nhất cần làm đầu tiên ngày mai?</span>
                <input
                  value={nextTop1}
                  onChange={(e) => setNextTop1(e.target.value)}
                  placeholder="VD: Giải xong bộ 20 câu trắc nghiệm chương 4..."
                  className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={saveEvening}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold"
              >
                <Save className="h-3.5 w-3.5" /> Lưu phản tư hôm nay
              </button>
            </div>

            {entries.length > 0 && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                <p className="text-[11px] font-bold text-[var(--text-muted)]">Lịch sử phản tư gần đây ({entries.length} ngày)</p>
                {entries.map((en) => (
                  <div
                    key={en.date}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-2.5 text-[11px]"
                  >
                    <p className="font-mono font-bold text-[var(--accent)]">{en.date}</p>
                    {en.win && <p className="mt-0.5">✓ <strong>Tốt:</strong> {en.win}</p>}
                    {en.blocker && <p className="mt-0.5">! <strong>Vướng:</strong> {en.blocker}</p>}
                    {en.nextTop1 && <p className="mt-0.5">→ <strong>Ưu tiên mai:</strong> {en.nextTop1}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOM COUNTDOWNS */}
        {tab === "countdowns" && (
          <div className="space-y-3 text-xs">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:grid-cols-4">
              <input
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="VD: Bảo vệ đồ án, Hạn học bổng..."
                className="sm:col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 outline-none"
              />
              <input
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 outline-none"
              />
              <button
                type="button"
                onClick={addCustomEvent}
                className="btn-primary inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Ghim mốc
              </button>
              <div className="sm:col-span-4 flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-muted)]">Màu thẻ:</span>
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEvColor(c)}
                    className={`h-5 w-5 rounded-full border-2 ${evColor === c ? "border-[var(--text-primary)] scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {sortedEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                Chưa có mốc sự kiện cá nhân nào. Thêm ngày bảo vệ, hạn học bổng hoặc kỳ nghỉ ở trên.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {sortedEvents.map((ev) => {
                  const d = diffDaysLocal(ev.date);
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                          <p className="truncate font-bold">{ev.title}</p>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{ev.date}</p>
                      </div>
                      <span
                        className="shrink-0 rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold text-white"
                        style={{ backgroundColor: ev.color }}
                      >
                        {d < 0 ? `Đã qua ${Math.abs(d)}d` : d === 0 ? "Hôm nay!" : `D-${d}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => saveEvents(events.filter((x) => x.id !== ev.id))}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CSV/EXCEL <-> MARKDOWN / JSON TABLE CONVERTER */}
        {tab === "table" && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setOutMode("markdown")}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    outMode === "markdown" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)]"
                  }`}
                >
                  Bảng Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setOutMode("json")}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    outMode === "json" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)]"
                  }`}
                >
                  Mảng JSON
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(convertedOutput).catch(() => {});
                  kfNotify(`Đã sao chép kết quả ${outMode.toUpperCase()}!`);
                }}
                disabled={!convertedOutput}
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5" /> Sao chép kết quả
              </button>
            </div>

            <textarea
              rows={5}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Dán dữ liệu CSV (phẩy), dấu chấm phẩy hoặc copy thẳng bảng từ Excel/Google Sheets (Tab)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 font-mono text-[11px] outline-none focus:border-[var(--accent)]"
            />

            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 p-3 font-mono text-[11px] text-[var(--text-primary)]">
              {convertedOutput || "Chưa có dữ liệu bảng để chuyển đổi."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
