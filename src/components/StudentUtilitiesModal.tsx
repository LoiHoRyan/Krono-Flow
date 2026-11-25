"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Backpack,
  BookOpenCheck,
  CalendarClock,
  Coffee,
  Copy,
  Plus,
  Quote,
  RotateCcw,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";

interface SplitExpense {
  id: string;
  payer: string;
  amount: number;
  note: string;
}

interface PackItem {
  id: string;
  label: string;
  done: boolean;
}

interface CaffeineEntry {
  id: string;
  name: string;
  mg: number;
  timeIso: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  dueAt: string;
  progress: number;
}

const PACK_KEY = "kronoflow-exam-pack-v1";
const CAFFEINE_KEY = "kronoflow-caffeine-v1";
const ASSIGN_KEY = "kronoflow-assignments-v1";

const DEFAULT_PACK: PackItem[] = [
  { id: "p1", label: "Thẻ sinh viên / CCCD", done: false },
  { id: "p2", label: "Bút bi xanh, bút chì, tẩy & máy tính bỏ túi", done: false },
  { id: "p3", label: "Slide PDF dự phòng (USB + Google Drive)", done: false },
  { id: "p4", label: "Laptop sạc đầy pin + củ sạc + cáp HDMI/Type-C", done: false },
  { id: "p5", label: "Chai nước lọc & phiếu ôn tập A4", done: false },
];

export function StudentUtilitiesModal({
  open,
  onClose,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
}) {
  const [tab, setTab] = useState<"cite" | "dayplan" | "split" | "pack" | "energy">("cite");

  // 1. Citation Generator
  const [cAuthor, setCAuthor] = useState("Nguyễn Văn A");
  const [cYear, setCYear] = useState("2025");
  const [cTitle, setCTitle] = useState("Giáo trình Nhập môn Tài chính – Tiền tệ");
  const [cPub, setCPub] = useState("NXB Đại học Quốc gia TP.HCM");
  const [cUrl, setCUrl] = useState("");

  // 2. 1-Day Smart Study Timetable
  const [startHr, setStartHr] = useState(8);
  const [endHr, setEndHr] = useState(17);
  const [pickedSubs, setPickedSubs] = useState<string[]>([]);

  // 3. Group Bill Splitter
  const [members, setMembers] = useState<string[]>(["An", "Bình", "Chi"]);
  const [newMember, setNewMember] = useState("");
  const [splitItems, setSplitItems] = useState<SplitExpense[]>([]);
  const [payer, setPayer] = useState("An");
  const [payAmt, setPayAmt] = useState("");
  const [payNote, setPayNote] = useState("");

  // 4. Exam & Defense Packing Checklist
  const [packItems, setPackItems] = useState<PackItem[]>(DEFAULT_PACK);
  const [newPackLabel, setNewPackLabel] = useState("");

  // 5. Caffeine Cut-off + Assignment Countdown
  const [caffeine, setCaffeine] = useState<CaffeineEntry[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [asgTitle, setAsgTitle] = useState("");
  const [asgDue, setAsgDue] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      const pRaw = localStorage.getItem(PACK_KEY);
      if (pRaw) setPackItems(JSON.parse(pRaw) as PackItem[]);
      const cRaw = localStorage.getItem(CAFFEINE_KEY);
      if (cRaw) setCaffeine(JSON.parse(cRaw) as CaffeineEntry[]);
      const aRaw = localStorage.getItem(ASSIGN_KEY);
      if (aRaw) setAssignments(JSON.parse(aRaw) as AssignmentItem[]);
    } catch {
      // ignore
    }
  }, [open]);

  const settlements = useMemo(() => {
    if (members.length < 2 || splitItems.length === 0) return [];
    const total = splitItems.reduce((a, b) => a + b.amount, 0);
    const share = total / members.length;
    const paid = new Map<string, number>();
    for (const m of members) paid.set(m, 0);
    for (const it of splitItems) {
      paid.set(it.payer, (paid.get(it.payer) ?? 0) + it.amount);
    }
    const debtors: { name: string; amt: number }[] = [];
    const creditors: { name: string; amt: number }[] = [];
    for (const m of members) {
      const bal = (paid.get(m) ?? 0) - share;
      if (bal < -1) debtors.push({ name: m, amt: -bal });
      else if (bal > 1) creditors.push({ name: m, amt: bal });
    }
    const tx: { from: string; to: string; amount: number }[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      if (!d || !c) break;
      const move = Math.min(d.amt, c.amt);
      if (move > 0) tx.push({ from: d.name, to: c.name, amount: Math.round(move) });
      d.amt -= move;
      c.amt -= move;
      if (d.amt < 1) i += 1;
      if (c.amt < 1) j += 1;
    }
    return tx;
  }, [members, splitItems]);

  const daySchedule = useMemo(() => {
    const names =
      pickedSubs.length > 0
        ? pickedSubs
        : subjects.slice(0, 3).map((s) => s.name);
    if (names.length === 0 || endHr <= startHr) return [];
    const blocks: { time: string; subject: string }[] = [];
    let curMin = startHr * 60;
    const limitMin = endHr * 60;
    let idx = 0;
    while (curMin + 50 <= limitMin && blocks.length < 10) {
      // Skip 12:00-13:30 lunch
      if (curMin >= 12 * 60 && curMin < 13 * 60 + 30) {
        curMin = 13 * 60 + 30;
        continue;
      }
      const sh = String(Math.floor(curMin / 60)).padStart(2, "0");
      const sm = String(curMin % 60).padStart(2, "0");
      const endM = curMin + 50;
      const eh = String(Math.floor(endM / 60)).padStart(2, "0");
      const em = String(endM % 60).padStart(2, "0");
      blocks.push({
        time: `${sh}:${sm} – ${eh}:${em}`,
        subject: names[idx % names.length] ?? "Tự học",
      });
      curMin += 60; // 50m study + 10m break
      idx += 1;
    }
    return blocks;
  }, [pickedSubs, subjects, startHr, endHr]);

  if (!open) return null;

  const saveJson = (k: string, v: unknown) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // ignore
    }
  };

  const apa = `${cAuthor.trim()} (${cYear.trim()}). *${cTitle.trim()}*. ${cPub.trim()}.${cUrl.trim() ? ` ${cUrl.trim()}` : ""}`;
  const ieee = `[1] ${cAuthor.trim()}, "${cTitle.trim()}," ${cPub.trim()}, ${cYear.trim()}.${cUrl.trim() ? ` [Online]. Available: ${cUrl.trim()}` : ""}`;
  const harvard = `${cAuthor.trim()} (${cYear.trim()}) '${cTitle.trim()}', ${cPub.trim()}.${cUrl.trim() ? ` Available at: ${cUrl.trim()}` : ""}`;

  const totalSplit = splitItems.reduce((a, b) => a + b.amount, 0);

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
            <Wrench className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Tiện ích Sinh viên (Trích dẫn, Xếp lịch 1 ngày, Chia tiền nhóm, Checklist thi, Cà phê & Deadline)
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
              ["cite", "Trích dẫn", Quote],
              ["dayplan", "Lịch 1 ngày", BookOpenCheck],
              ["split", "Chia tiền nhóm", Users],
              ["pack", "Soạn đồ thi", Backpack],
              ["energy", "Cà phê & Hạn nộp", Coffee],
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

        {/* TAB 1: CITATION GENERATOR */}
        {tab === "cite" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-2">
              <input
                type="text"
                value={cAuthor}
                onChange={(e) => setCAuthor(e.target.value)}
                placeholder="Tác giả (VD: Nguyễn Văn A)"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={cYear}
                onChange={(e) => setCYear(e.target.value)}
                placeholder="Năm xuất bản (VD: 2025)"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                placeholder="Tiêu đề sách / bài báo"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 sm:col-span-2"
              />
              <input
                type="text"
                value={cPub}
                onChange={(e) => setCPub(e.target.value)}
                placeholder="Nhà xuất bản / Tạp chí"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="url"
                value={cUrl}
                onChange={(e) => setCUrl(e.target.value)}
                placeholder="URL tài liệu (tùy chọn)"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
            </div>

            {(
              [
                ["APA 7", apa],
                ["IEEE", ieee],
                ["Harvard", harvard],
              ] as const
            ).map(([style, text]) => (
              <div
                key={style}
                className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase text-[var(--accent)]">{style}</div>
                  <div className="mt-1 select-all text-[var(--text-primary)]">{text}</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[11px] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Copy className="h-3 w-3" /> Chép
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: 1-DAY SMART STUDY TIMETABLE */}
        {tab === "dayplan" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">Từ:</span>
                  <input
                    type="number"
                    min={5}
                    max={21}
                    value={startHr}
                    onChange={(e) => setStartHr(Number(e.target.value))}
                    className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  />
                  <span>giờ</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">Đến:</span>
                  <input
                    type="number"
                    min={6}
                    max={23}
                    value={endHr}
                    onChange={(e) => setEndHr(Number(e.target.value))}
                    className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  />
                  <span>giờ</span>
                </label>
                {daySchedule.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const txt = daySchedule.map((b) => `• ${b.time}: ${b.subject} (50p học / 10p nghỉ)`).join("\n");
                      navigator.clipboard?.writeText(txt).catch(() => {});
                      window.alert("Đã sao chép lịch ôn 1 ngày!");
                    }}
                    className="btn-primary ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px]"
                  >
                    <Copy className="h-3 w-3" /> Chép lịch
                  </button>
                )}
              </div>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subjects.map((s) => {
                    const active = pickedSubs.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setPickedSubs((prev) =>
                            active ? prev.filter((x) => x !== s.name) : [...prev, s.name]
                          )
                        }
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {daySchedule.length === 0 ? (
                <p className="py-4 text-center text-[var(--text-muted)]">
                  Chọn ít nhất 1 môn học (hoặc thêm môn ở tab Môn học) để tự xếp ca 50p/10p.
                </p>
              ) : (
                daySchedule.map((b, i) => (
                  <div
                    key={`${b.time}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                  >
                    <span className="font-mono font-semibold text-[var(--accent)]">{b.time}</span>
                    <span className="font-medium text-[var(--text-primary)]">{b.subject}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">50p + 10p nghỉ</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GROUP BILL SPLITTER */}
        {tab === "split" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              {members.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px]"
                >
                  {m}
                  {members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setMembers((prev) => prev.filter((x) => x !== m))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              <input
                type="text"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMember.trim()) {
                    e.preventDefault();
                    if (!members.includes(newMember.trim())) setMembers((p) => [...p, newMember.trim()]);
                    setNewMember("");
                  }
                }}
                placeholder="+ Thêm tên rồi Enter..."
                className="w-36 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px]"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(payAmt);
                if (!amt || amt <= 0) return;
                setSplitItems((prev) => [
                  { id: `${Date.now()}`, payer, amount: amt, note: payNote.trim() || "Chi chung" },
                  ...prev,
                ]);
                setPayAmt("");
                setPayNote("");
              }}
              className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-4"
            >
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5"
              >
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m} đã trả
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                min={1000}
                step={1000}
                value={payAmt}
                onChange={(e) => setPayAmt(e.target.value)}
                placeholder="Số tiền (VNĐ)..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono"
              />
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Khoản chi (VD: In slide)..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <button type="submit" className="btn-primary inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Thêm khoản
              </button>
            </form>

            {splitItems.length > 0 && (
              <div className="space-y-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Tổng chi: {totalSplit.toLocaleString("vi-VN")} ₫ · Mỗi người:{" "}
                    {Math.round(totalSplit / members.length).toLocaleString("vi-VN")} ₫
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const lines = [
                        `💸 Tổng kết chia tiền nhóm (${totalSplit.toLocaleString("vi-VN")} ₫ / ${members.length} người):`,
                        ...settlements.map((s) => `• ${s.from} chuyển cho ${s.to}: ${s.amount.toLocaleString("vi-VN")} ₫`),
                      ];
                      navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
                      window.alert("Đã sao chép bảng chia tiền gửi nhóm!");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
                  >
                    <Copy className="h-3 w-3" /> Chép gửi nhóm
                  </button>
                </div>
                {settlements.length === 0 ? (
                  <div className="text-[11px] text-emerald-600">Mọi người đã chia đều, không ai cần chuyển thêm!</div>
                ) : (
                  settlements.map((s, idx) => (
                    <div key={idx} className="text-xs font-medium text-[var(--text-primary)]">
                      → <strong>{s.from}</strong> chuyển cho <strong>{s.to}</strong>:{" "}
                      <span className="font-mono text-[var(--accent)]">{s.amount.toLocaleString("vi-VN")} ₫</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EXAM & DEFENSE PACKING CHECKLIST */}
        {tab === "pack" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPackLabel.trim()) return;
                  const next = [...packItems, { id: `p-${Date.now()}`, label: newPackLabel.trim(), done: false }];
                  setPackItems(next);
                  saveJson(PACK_KEY, next);
                  setNewPackLabel("");
                }}
                className="flex flex-1 gap-1.5"
              >
                <input
                  type="text"
                  value={newPackLabel}
                  onChange={(e) => setNewPackLabel(e.target.value)}
                  placeholder="Thêm vật dụng cần mang..."
                  className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5"
                />
                <button type="submit" className="btn-primary rounded-xl px-3 py-1.5 font-medium">
                  + Thêm
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  const next = packItems.map((x) => ({ ...x, done: false }));
                  setPackItems(next);
                  saveJson(PACK_KEY, next);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-2.5 py-1.5 text-[11px]"
              >
                <RotateCcw className="h-3 w-3" /> Bỏ tick hết
              </button>
            </div>
            <div className="space-y-1.5">
              {packItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() => {
                        const next = packItems.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x));
                        setPackItems(next);
                        saveJson(PACK_KEY, next);
                      }}
                    />
                    <span className={it.done ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}>
                      {it.label}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = packItems.filter((x) => x.id !== it.id);
                      setPackItems(next);
                      saveJson(PACK_KEY, next);
                    }}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CAFFEINE CUT-OFF & ASSIGNMENT HOURLY COUNTDOWN */}
        {tab === "energy" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                  <Coffee className="h-4 w-4 text-amber-600" />
                  Theo dõi Caffeine hôm nay (chu kỳ bán rã ~5 giờ)
                </span>
                {caffeine.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCaffeine([]);
                      saveJson(CAFFEINE_KEY, []);
                    }}
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    Xóa nhật ký
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Cà phê sữa đá", mg: 100 },
                  { name: "Espresso / Đen đá", mg: 85 },
                  { name: "Trà sữa / Trà đào", mg: 55 },
                  { name: "Nước tăng lực", mg: 80 },
                ].map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => {
                      const next = [
                        { id: `${Date.now()}`, name: d.name, mg: d.mg, timeIso: new Date().toISOString() },
                        ...caffeine,
                      ].slice(0, 8);
                      setCaffeine(next);
                      saveJson(CAFFEINE_KEY, next);
                    }}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] hover:border-[var(--accent)]"
                  >
                    + {d.name} ({d.mg}mg)
                  </button>
                ))}
              </div>
              {caffeine.length > 0 && (() => {
                const nowMs = Date.now();
                const activeMg = caffeine.reduce((sum, c) => {
                  const hrs = Math.max(0, (nowMs - new Date(c.timeIso).getTime()) / 3600000);
                  return sum + c.mg * Math.pow(0.5, hrs / 5);
                }, 0);
                const latest = caffeine[0];
                const halfTime = latest
                  ? new Date(new Date(latest.timeIso).getTime() + 5 * 3600000).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <div className="rounded-lg bg-[var(--bg-surface)] px-3 py-2 text-[11px]">
                    Caffeine ước tính còn lại: <strong className="font-mono text-amber-600">{Math.round(activeMg)} mg</strong>{" "}
                    · Mốc giảm 50% từ ly gần nhất: <strong className="font-mono">{halfTime}</strong>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                <CalendarClock className="h-4 w-4 text-rose-500" />
                Đếm ngược Hạn nộp bài tập lớn / Đồ án tới từng giờ
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!asgTitle.trim() || !asgDue) return;
                  const next = [
                    ...assignments,
                    { id: `${Date.now()}`, title: asgTitle.trim(), dueAt: asgDue, progress: 0 },
                  ].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
                  setAssignments(next);
                  saveJson(ASSIGN_KEY, next);
                  setAsgTitle("");
                  setAsgDue("");
                }}
                className="flex flex-wrap gap-1.5"
              >
                <input
                  type="text"
                  required
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  placeholder="Tên bài nộp / Đồ án..."
                  className="min-w-[160px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
                />
                <input
                  type="datetime-local"
                  required
                  value={asgDue}
                  onChange={(e) => setAsgDue(e.target.value)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-[11px]"
                />
                <button type="submit" className="btn-primary rounded-lg px-3 py-1.5 font-medium">
                  + Thêm
                </button>
              </form>
              {assignments.map((a) => {
                const hrs = Math.round((new Date(a.dueAt).getTime() - Date.now()) / 3600000);
                const d = Math.floor(Math.max(0, hrs) / 24);
                const h = Math.max(0, hrs) % 24;
                return (
                  <div
                    key={a.id}
                    className="space-y-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{a.title}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[11px] font-semibold ${hrs <= 24 ? "text-rose-500" : "text-[var(--accent)]"}`}>
                          {hrs <= 0 ? "Đã quá hạn" : `Còn ${d} ngày ${h} giờ`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = assignments.filter((x) => x.id !== a.id);
                            setAssignments(next);
                            saveJson(ASSIGN_KEY, next);
                          }}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={a.progress}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const next = assignments.map((x) => (x.id === a.id ? { ...x, progress: v } : x));
                          setAssignments(next);
                          saveJson(ASSIGN_KEY, next);
                        }}
                        className="h-1 flex-1 accent-[var(--accent)]"
                      />
                      <span className="w-8 text-right font-mono font-semibold">{a.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
