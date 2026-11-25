"use client";

import { useMemo, useState } from "react";
import { Binary, Braces, Calculator, Copy, Cpu, KeyRound, X } from "lucide-react";

function fmtOps(n: number): string {
  if (!isFinite(n)) return "∞ (Quá lớn)";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} × 10¹²`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} × 10⁹`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} × 10⁶`;
  return Math.round(n).toLocaleString("vi-VN");
}

export function TechFinanceLabModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"base" | "bigo" | "finance" | "json">("base");

  // 1. Base & Data Converter
  const [decInput, setDecInput] = useState("255");
  const [mbInput, setMbInput] = useState("1024");
  const [mbpsInput, setMbpsInput] = useState("100");

  // 2. Big-O Lab
  const [nVal, setNVal] = useState(100000);

  // 3. Compound Interest & TVM
  const [principal, setPrincipal] = useState(10000000);
  const [monthlyAdd, setMonthlyAdd] = useState(1000000);
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(5);

  // 4. JSON & Password Studio
  const [jsonRaw, setJsonRaw] = useState('{"app":"KronoFlow","version":"pro","features":["GPA","Flashcards"]}');
  const [jsonErr, setJsonErr] = useState("");
  const [pwLen, setPwLen] = useState(16);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [pwOut, setPwOut] = useState("");

  const decNum = useMemo(() => {
    const n = parseInt(decInput.trim(), 10);
    return isNaN(n) || n < 0 ? null : n;
  }, [decInput]);

  const bigORows = useMemo(() => {
    const n = Math.max(1, nVal);
    const logN = Math.log2(n);
    return [
      { name: "O(1)", ops: 1, note: "Truy cập mảng, HashMap" },
      { name: "O(log n)", ops: logN, note: "Tìm kiếm nhị phân, Cây cân bằng" },
      { name: "O(n)", ops: n, note: "Duyệt tuyến tính, BFS/DFS" },
      { name: "O(n log n)", ops: n * logN, note: "Merge Sort, Quick Sort, Heap" },
      { name: "O(n²)", ops: n * n, note: "2 vòng lặp lồng nhau, Bubble Sort" },
      { name: "O(2ⁿ)", ops: n <= 60 ? Math.pow(2, n) : Infinity, note: "Quay lui vét cạn (Backtracking)" },
    ];
  }, [nVal]);

  const financeStats = useMemo(() => {
    const r = Math.max(0, annualRate) / 100 / 12;
    const m = Math.max(1, Math.round(years * 12));
    const contributed = principal + monthlyAdd * m;
    const fv =
      r === 0
        ? contributed
        : principal * Math.pow(1 + r, m) + monthlyAdd * ((Math.pow(1 + r, m) - 1) / r);
    const pvOfFv = r === 0 ? fv : fv / Math.pow(1 + r, m);
    const pmtLoan =
      r === 0 ? principal / m : (principal * (r * Math.pow(1 + r, m))) / (Math.pow(1 + r, m) - 1);
    return {
      contributed: Math.round(contributed),
      fv: Math.round(fv),
      interest: Math.round(fv - contributed),
      pvOfFv: Math.round(pvOfFv),
      pmtLoan: Math.round(pmtLoan),
    };
  }, [principal, monthlyAdd, annualRate, years]);

  if (!open) return null;

  const generatePassword = () => {
    const base = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const sym = "!@#$%^&*_-+=";
    const pool = pwSymbols ? base + sym : base;
    let out = "";
    const arr = new Uint32Array(pwLen);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
      for (let i = 0; i < pwLen; i++) {
        out += pool[(arr[i] ?? 0) % pool.length] ?? "a";
      }
    } else {
      for (let i = 0; i < pwLen; i++) {
        out += pool[Math.floor(Math.random() * pool.length)] ?? "a";
      }
    }
    setPwOut(out);
  };

  const mbNum = Number(mbInput) || 0;
  const mbpsNum = Number(mbpsInput) || 0;

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
            <Cpu className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Phòng Lab Kỹ thuật, Big-O, Tài chính & JSON
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
              ["base", "Hệ cơ số & Dữ liệu", Binary],
              ["bigo", "Độ phức tạp Big-O", Cpu],
              ["finance", "Tài chính & Lãi kép", Calculator],
              ["json", "JSON & Mật khẩu", Braces],
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

        {/* TAB 1: BASE & DATA CONVERTER */}
        {tab === "base" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="font-semibold text-[var(--text-primary)]">Chuyển đổi Hệ cơ số (DEC ↔ BIN / OCT / HEX)</div>
              <input
                type="number"
                min={0}
                value={decInput}
                onChange={(e) => setDecInput(e.target.value)}
                placeholder="Nhập số nguyên không âm (Thập phân)..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Nhị phân (BIN)", val: decNum !== null ? decNum.toString(2) : "—" },
                  { label: "Bát phân (OCT)", val: decNum !== null ? decNum.toString(8) : "—" },
                  { label: "Thập lục phân (HEX)", val: decNum !== null ? `0x${decNum.toString(16).toUpperCase()}` : "—" },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
                    <div className="text-[10px] text-[var(--text-muted)]">{row.label}</div>
                    <div className="mt-1 break-all font-mono font-bold text-[var(--accent)]">{row.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
                <div className="font-semibold text-[var(--text-primary)]">Đổi Dung lượng (nhập MB)</div>
                <input
                  type="number"
                  min={0}
                  value={mbInput}
                  onChange={(e) => setMbInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono"
                />
                <div className="space-y-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                  <div>KB: {(mbNum * 1024).toLocaleString("vi-VN")} KB</div>
                  <div>GB: {(mbNum / 1024).toFixed(3)} GB</div>
                  <div>TB: {(mbNum / (1024 * 1024)).toFixed(6)} TB</div>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
                <div className="font-semibold text-[var(--text-primary)]">Đổi Tốc độ mạng (Mbps ↔ MB/s)</div>
                <input
                  type="number"
                  min={0}
                  value={mbpsInput}
                  onChange={(e) => setMbpsInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono"
                />
                <div className="space-y-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                  <div>Tốc độ tải thực tế: <strong className="text-[var(--accent)]">{(mbpsNum / 8).toFixed(2)} MB/s</strong></div>
                  <div>Tải file 1 GB mất: ~{mbpsNum > 0 ? Math.ceil((1024 * 8) / mbpsNum) : 0} giây</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BIG-O COMPLEXITY LAB */}
        {tab === "bigo" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">Kích thước đầu vào n =</span>
                <input
                  type="number"
                  min={1}
                  max={10000000}
                  value={nVal}
                  onChange={(e) => setNVal(Math.max(1, Number(e.target.value)))}
                  className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono font-bold"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[100, 1000, 10000, 100000, 1000000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setNVal(v)}
                    className={`rounded-lg border px-2 py-0.5 font-mono text-[10px] ${
                      nVal === v
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                        : "border-[var(--border-subtle)]"
                    }`}
                  >
                    {v.toLocaleString("vi-VN")}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {bigORows.map((r) => {
                const status =
                  r.ops <= 1e7
                    ? { lbl: "Rất nhanh (<0.1s)", cls: "bg-emerald-500/15 text-emerald-600" }
                    : r.ops <= 2e8
                    ? { lbl: "Cận biên (~1s)", cls: "bg-amber-500/15 text-amber-600" }
                    : { lbl: "Quá giờ TLE", cls: "bg-rose-500/15 text-rose-500" };
                return (
                  <div
                    key={r.name}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                  >
                    <div>
                      <span className="font-mono font-bold text-[var(--accent)]">{r.name}</span>
                      <span className="ml-2 text-[11px] text-[var(--text-muted)]">{r.note}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--text-primary)]">{fmtOps(r.ops)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                        {status.lbl}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: COMPOUND INTEREST & TVM */}
        {tab === "finance" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 sm:grid-cols-4">
              <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                <span>Vốn ban đầu (VNĐ)</span>
                <input
                  type="number"
                  step={500000}
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                <span>Góp thêm / tháng</span>
                <input
                  type="number"
                  step={100000}
                  value={monthlyAdd}
                  onChange={(e) => setMonthlyAdd(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                <span>Lãi suất (%/năm)</span>
                <input
                  type="number"
                  step={0.5}
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-[10px] text-[var(--text-muted)]">
                <span>Thời gian (năm)</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={years}
                  onChange={(e) => setYears(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                />
              </label>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">Giá trị tương lai (FV)</div>
                <div className="mt-1 font-mono text-xl font-bold text-[var(--accent)]">
                  {financeStats.fv.toLocaleString("vi-VN")} ₫
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Tổng gốc góp: {financeStats.contributed.toLocaleString("vi-VN")} ₫ · Lãi sinh ra:{" "}
                  <strong className="text-emerald-600">+{financeStats.interest.toLocaleString("vi-VN")} ₫</strong>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-muted)]">Trả góp đều hàng tháng (PMT nếu vay gốc)</div>
                <div className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">
                  {financeStats.pmtLoan.toLocaleString("vi-VN")} ₫/tháng
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Giá trị hiện tại quy đổi (PV của FV): {financeStats.pvOfFv.toLocaleString("vi-VN")} ₫
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: JSON FORMATTER & PASSWORD GENERATOR */}
        {tab === "json" && (
          <div className="mt-4 space-y-4 text-xs">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">Kiểm tra & Làm đẹp JSON</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setJsonRaw(JSON.stringify(JSON.parse(jsonRaw), null, 2));
                        setJsonErr("");
                      } catch (err) {
                        setJsonErr(err instanceof Error ? err.message : "JSON không hợp lệ");
                      }
                    }}
                    className="btn-primary rounded-lg px-2.5 py-1 text-[11px]"
                  >
                    Làm đẹp (Format)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setJsonRaw(JSON.stringify(JSON.parse(jsonRaw)));
                        setJsonErr("");
                      } catch (err) {
                        setJsonErr(err instanceof Error ? err.message : "JSON không hợp lệ");
                      }
                    }}
                    className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-[11px]"
                  >
                    Nén gọn
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={jsonRaw}
                onChange={(e) => setJsonRaw(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 font-mono text-[11px]"
              />
              {jsonErr ? (
                <div className="text-[11px] text-rose-500">Lỗi cú pháp: {jsonErr}</div>
              ) : (
                <div className="text-[11px] text-emerald-600">JSON sẵn sàng định dạng hoặc sao chép.</div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                  <KeyRound className="h-3.5 w-3.5 text-[var(--accent)]" /> Tạo mật khẩu mạnh 1 chạm
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1">
                    Độ dài:
                    <input
                      type="number"
                      min={8}
                      max={32}
                      value={pwLen}
                      onChange={(e) => setPwLen(Math.min(32, Math.max(8, Number(e.target.value))))}
                      className="w-14 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={pwSymbols} onChange={(e) => setPwSymbols(e.target.checked)} />
                    Ký tự đặc biệt
                  </label>
                  <button type="button" onClick={generatePassword} className="btn-primary rounded-lg px-2.5 py-1">
                    Tạo mới
                  </button>
                </div>
              </div>
              {pwOut && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-surface)] px-3 py-2 font-mono text-xs">
                  <span className="truncate font-bold text-[var(--accent)]">{pwOut}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(pwOut).catch(() => {})}
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    <Copy className="h-3 w-3" /> Chép
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
