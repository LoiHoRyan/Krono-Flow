"use client";

import { useEffect, useState } from "react";
import {
  CalendarRange,
  Lock,
  PiggyBank,
  Plus,
  Trash2,
  Unlock,
  Wind,
  X,
} from "lucide-react";

interface MilestoneItem {
  id: string;
  title: string;
  date: string;
}

interface SavingsJar {
  id: string;
  title: string;
  saved: number;
  target: number;
}

const MILE_KEY = "kronoflow-milestones-v1";
const JARS_KEY = "kronoflow-savings-jars-v1";
const PIN_KEY = "kronoflow-lock-pin-v1";

export function LifeBalancePinModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"semester" | "jars" | "breath" | "lock">("semester");

  // 1. Semester progress & milestones
  const [semStart, setSemStart] = useState("2026-09-07");
  const [semEnd, setSemEnd] = useState("2027-01-15");
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");

  // 2. Savings Jars
  const [jars, setJars] = useState<SavingsJar[]>([]);
  const [jTitle, setJTitle] = useState("");
  const [jTarget, setJTarget] = useState("5000000");

  // 3. Breathing Coach (Box 4-4-4-4 / 4-7-8)
  const [breathMode, setBreathMode] = useState<"box" | "478">("box");
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathTick, setBreathTick] = useState(0);

  // 4. Privacy PIN Lock
  const [pin, setPin] = useState("1234");
  const [locked, setLocked] = useState(false);
  const [pinAttempt, setPinAttempt] = useState("");
  const [pinErr, setPinErr] = useState(false);

  useEffect(() => {
    try {
      const rM = localStorage.getItem(MILE_KEY);
      if (rM) setMilestones(JSON.parse(rM) as MilestoneItem[]);
      const rJ = localStorage.getItem(JARS_KEY);
      if (rJ) setJars(JSON.parse(rJ) as SavingsJar[]);
      const rP = localStorage.getItem(PIN_KEY);
      if (rP && /^\d{4}$/.test(rP)) setPin(rP);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!breathRunning || !open || tab !== "breath") return;
    const id = setInterval(() => setBreathTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [breathRunning, open, tab]);

  const saveJson = (k: string, v: unknown) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // ignore
    }
  };

  // Fullscreen Privacy Lock Overlay stays visible even if modal closes!
  if (locked) {
    return (
      <div className="no-print fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#090d16]/95 p-6 text-slate-100 backdrop-blur-xl">
        <div className="w-full max-w-xs space-y-4 rounded-2xl border border-white/15 bg-white/5 p-6 text-center shadow-2xl">
          <Lock className="mx-auto h-8 w-8 text-sky-400" />
          <h3 className="text-base font-semibold">KronoFlow đang khóa tạm thời</h3>
          <p className="text-xs text-slate-400">Nhập mã PIN 4 số để tiếp tục học tập</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pinAttempt === pin) {
                setLocked(false);
                setPinAttempt("");
                setPinErr(false);
              } else {
                setPinErr(true);
                setPinAttempt("");
              }
            }}
            className="space-y-3"
          >
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pinAttempt}
              onChange={(e) => {
                setPinAttempt(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinErr(false);
              }}
              placeholder="••••"
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none focus:border-sky-400"
            />
            {pinErr && <div className="text-xs text-rose-400">Mã PIN chưa đúng, vui lòng thử lại.</div>}
            <button
              type="submit"
              className="btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
            >
              <Unlock className="h-3.5 w-3.5" /> Mở khóa
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!open) return null;

  const sStartMs = new Date(semStart).getTime();
  const sEndMs = new Date(semEnd).getTime();
  const nowMs = Date.now();
  const semPct =
    sEndMs > sStartMs
      ? Math.min(100, Math.max(0, Math.round(((nowMs - sStartMs) / (sEndMs - sStartMs)) * 100)))
      : 0;
  const semDaysLeft = Math.max(0, Math.ceil((sEndMs - nowMs) / 86400000));

  // Breathing phase calculation
  const cycleLen = breathMode === "box" ? 16 : 19;
  const secInCycle = breathTick % cycleLen;
  const breathPhase =
    breathMode === "box"
      ? secInCycle < 4
        ? { label: "Hít vào chậm", sec: 4 - secInCycle, expand: true }
        : secInCycle < 8
        ? { label: "Giữ hơi", sec: 8 - secInCycle, expand: true }
        : secInCycle < 12
        ? { label: "Thở ra đều", sec: 12 - secInCycle, expand: false }
        : { label: "Nghỉ nhẹ", sec: 16 - secInCycle, expand: false }
      : secInCycle < 4
      ? { label: "Hít vào bằng mũi", sec: 4 - secInCycle, expand: true }
      : secInCycle < 11
      ? { label: "Giữ hơi (7s)", sec: 11 - secInCycle, expand: true }
      : { label: "Thở ra từ từ (8s)", sec: 19 - secInCycle, expand: false };

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
            <CalendarRange className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Tiến độ Học kỳ, Hũ Tiết kiệm, Hít thở Thư giãn & Khóa PIN
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
              ["semester", "Tiến độ Học kỳ", CalendarRange],
              ["jars", "Hũ Tiết kiệm", PiggyBank],
              ["breath", "Hít thở 4-7-8", Wind],
              ["lock", "Khóa màn hình PIN", Lock],
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

        {/* TAB 1: SEMESTER PROGRESS & MILESTONES */}
        {tab === "semester" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  Tiến độ Học kỳ hiện tại: <strong className="font-mono text-[var(--accent)]">{semPct}%</strong>
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Còn {semDaysLeft} ngày kết thúc kỳ</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${semPct}%` }} />
              </div>
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)]">Bắt đầu kỳ:</span>
                  <input
                    type="date"
                    value={semStart}
                    onChange={(e) => setSemStart(e.target.value)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[var(--text-muted)]">Kết thúc kỳ:</span>
                  <input
                    type="date"
                    value={semEnd}
                    onChange={(e) => setSemEnd(e.target.value)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono"
                  />
                </label>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!mTitle.trim() || !mDate) return;
                const next = [...milestones, { id: `ms-${Date.now()}`, title: mTitle.trim(), date: mDate }].sort(
                  (a, b) => a.date.localeCompare(b.date)
                );
                setMilestones(next);
                saveJson(MILE_KEY, next);
                setMTitle("");
                setMDate("");
              }}
              className="flex flex-wrap gap-1.5"
            >
              <input
                type="text"
                required
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="Mốc sự kiện (Thi IELTS, Bảo vệ đồ án, Nghỉ Tết...)"
                className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5"
              />
              <input
                type="date"
                required
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono"
              />
              <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Thêm mốc
              </button>
            </form>

            <div className="space-y-1.5">
              {milestones.map((m) => {
                const d = Math.ceil((new Date(m.date).getTime() - nowMs) / 86400000);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                  >
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{m.title}</span>
                      <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)]">{m.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[var(--accent)]">
                        {d >= 0 ? `Còn ${d} ngày` : "Đã qua"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = milestones.filter((x) => x.id !== m.id);
                          setMilestones(next);
                          saveJson(MILE_KEY, next);
                        }}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SAVINGS JARS */}
        {tab === "jars" && (
          <div className="mt-4 space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const tgt = Number(jTarget);
                if (!jTitle.trim() || !tgt || tgt <= 0) return;
                const next = [{ id: `jar-${Date.now()}`, title: jTitle.trim(), saved: 0, target: tgt }, ...jars];
                setJars(next);
                saveJson(JARS_KEY, next);
                setJTitle("");
              }}
              className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
            >
              <input
                type="text"
                required
                value={jTitle}
                onChange={(e) => setJTitle(e.target.value)}
                placeholder="Mục tiêu tiết kiệm (VD: Quỹ nâng cấp Laptop)..."
                className="min-w-[180px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="number"
                required
                min={50000}
                step={100000}
                value={jTarget}
                onChange={(e) => setJTarget(e.target.value)}
                className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono"
              />
              <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Tạo hũ
              </button>
            </form>

            {jars.map((j) => {
              const pct = Math.min(100, Math.round((j.saved / Math.max(1, j.target)) * 100));
              const addAmt = (delta: number) => {
                const next = jars.map((x) =>
                  x.id === j.id ? { ...x, saved: Math.max(0, x.saved + delta) } : x
                );
                setJars(next);
                saveJson(JARS_KEY, next);
              };
              return (
                <div key={j.id} className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">{j.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-600">
                        {j.saved.toLocaleString("vi-VN")} / {j.target.toLocaleString("vi-VN")} ₫ ({pct}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = jars.filter((x) => x.id !== j.id);
                          setJars(next);
                          saveJson(JARS_KEY, next);
                        }}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[50000, 100000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => addAmt(amt)}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[11px] hover:border-emerald-500 hover:text-emerald-600"
                      >
                        +{(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: BREATHING COACH */}
        {tab === "breath" && (
          <div className="mt-4 flex flex-col items-center space-y-4 py-4 text-xs">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBreathMode("box");
                  setBreathTick(0);
                }}
                className={`rounded-xl border px-3 py-1.5 font-medium ${
                  breathMode === "box" ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)]"
                }`}
              >
                Box Breathing (4-4-4-4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBreathMode("478");
                  setBreathTick(0);
                }}
                className={`rounded-xl border px-3 py-1.5 font-medium ${
                  breathMode === "478" ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)]"
                }`}
              >
                Thư giãn 4-7-8
              </button>
            </div>

            <div
              className={`flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-[var(--accent)] bg-[var(--accent-soft)] transition-transform duration-1000 ${
                breathRunning && breathPhase.expand ? "scale-110" : "scale-95"
              }`}
            >
              <div className="text-sm font-semibold text-[var(--accent)]">
                {breathRunning ? breathPhase.label : "Sẵn sàng"}
              </div>
              {breathRunning && (
                <div className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {breathPhase.sec}s
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setBreathRunning((v) => !v)}
              className="btn-primary rounded-xl px-5 py-2 text-xs font-medium"
            >
              {breathRunning ? "Dừng bài tập" : "Bắt đầu hít thở 2 phút"}
            </button>
          </div>
        )}

        {/* TAB 4: QUICK PRIVACY PIN LOCK */}
        {tab === "lock" && (
          <div className="mt-4 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 text-xs">
            <div className="font-semibold text-[var(--text-primary)]">
              Khóa màn hình tạm thời khi rời bàn (thư viện / quán cà phê)
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Đặt mã PIN 4 chữ số của bạn rồi bấm khóa để che toàn bộ điểm GPA, ghi chú và tài chính.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span>Mã PIN 4 số:</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(clean);
                    if (clean.length === 4) {
                      try {
                        localStorage.setItem(PIN_KEY, clean);
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  className="w-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-center font-mono text-sm tracking-widest"
                />
              </label>
              <button
                type="button"
                disabled={pin.length !== 4}
                onClick={() => {
                  setPinAttempt("");
                  setPinErr(false);
                  setLocked(true);
                }}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 font-medium disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" /> Khóa màn hình ngay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
