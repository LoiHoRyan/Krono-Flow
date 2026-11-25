"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Wallet, TrendingDown,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number;
  category: string;
  spentDate: string;
}

const CATEGORIES = ["Sách & Giáo trình", "Khóa học", "In ấn & Dụng cụ", "Cà phê học bài", "Khác"];

export function ExpensesPanel({
  expenses,
  totalStudyHours = 0,
  onNotify,
  onRefresh,
}: {
  expenses: ExpenseRecord[];
  totalStudyHours?: number;
  onNotify: (msg: string) => void;
  onRefresh: () => void;
}) {
  const { lang } = useLang();
  const [title, setTitle] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState(1500000);
  const [savingsName, setSavingsName] = useState("Quỹ mua khóa học / sách");
  const [savingsTarget, setSavingsTarget] = useState(2000000);
  const [savingsCurrent, setSavingsCurrent] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-savings-goal");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) setSavingsName(parsed.name);
        if (parsed.target) setSavingsTarget(Number(parsed.target));
        if (parsed.current) setSavingsCurrent(Number(parsed.current));
      }
    } catch {
      // ignore
    }
  }, []);

  const persistSavings = (name: string, target: number, current: number) => {
    setSavingsName(name);
    setSavingsTarget(target);
    setSavingsCurrent(current);
    localStorage.setItem("kronoflow-savings-goal", JSON.stringify({ name, target, current }));
  };

  useEffect(() => {
    const raw = localStorage.getItem("kronoflow-monthly-budget");
    if (raw) {
      const n = Number(raw);
      if (!isNaN(n) && n > 0) setMonthlyBudget(n);
    }
  }, []);

  const updateBudget = (val: number) => {
    const safe = Math.max(100000, val);
    setMonthlyBudget(safe);
    localStorage.setItem("kronoflow-monthly-budget", String(safe));
  };
  const [amount, setAmount] = useState("50000");
  const [category, setCategory] = useState(CATEGORIES[0] ?? "Khác");
  const [spentDate, setSpentDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        amount: Number(amount),
        category,
        spentDate,
      }),
    });
    if (res.ok) {
      setTitle("");
      onNotify(lang === "vi" ? "Đã lưu khoản chi tiêu!" : "Expense saved!");
      onRefresh();
    }
  };

  const exportCsv = () => {
    const header = "Ngay,Danh muc,Khoan chi,So tien (VND)\n";
    const rows = expenses
      .map((e) => `${e.spentDate},"${e.category.replaceAll('"', '""')}","${e.title.replaceAll('"', '""')}",${e.amount}`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const prevMonthPrefix = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date((y ?? 2026), (m ?? 1) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const monthTotal = expenses
    .filter((e) => e.spentDate.startsWith(selectedMonth))
    .reduce((a, b) => a + b.amount, 0);
  const prevMonthTotal = expenses
    .filter((e) => e.spentDate.startsWith(prevMonthPrefix))
    .reduce((a, b) => a + b.amount, 0);
  const momPct =
    prevMonthTotal > 0 ? Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 100) : null;
  const allTotal = expenses.reduce((a, b) => a + b.amount, 0);

  const byCat = CATEGORIES.map((cat) => {
    const sum = expenses.filter((e) => e.category === cat).reduce((a, b) => a + b.amount, 0);
    return { cat, sum };
  }).filter((x) => x.sum > 0);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-4 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-[var(--text-primary)]">
            Ghi nhanh 1 chạm (Khoản hay lặp)
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            Bấm để lưu thẳng vào tháng này
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { title: "Cà phê học bài", amount: 35000, category: "Cà phê học bài" },
            { title: "In tài liệu / Photo", amount: 20000, category: "In ấn & Dụng cụ" },
            { title: "Sách & Giáo trình", amount: 120000, category: "Sách & Giáo trình" },
            { title: "Gửi xe / Di chuyển", amount: 10000, category: "Khác" },
          ].map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={async () => {
                const res = await fetch("/api/expenses", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: preset.title,
                    amount: preset.amount,
                    category: preset.category,
                    spentDate: new Date().toISOString().slice(0, 10),
                  }),
                });
                if (res.ok) {
                  onNotify(`Đã ghi nhanh: ${preset.title} (${preset.amount.toLocaleString("vi-VN")} ₫)`);
                  onRefresh();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <span>+ {preset.title}</span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                {(preset.amount / 1000).toFixed(0)}k
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="stagger-grid grid gap-4 sm:grid-cols-2">
        <div className="glass-card card-lift rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[var(--accent)]" />
              {lang === "vi" ? "Chi tiêu theo tháng" : "Monthly Spent"}
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-primary)]"
            />
          </div>
          {(() => {
            const now = new Date();
            const curYm = now.toISOString().slice(0, 7);
            if (selectedMonth !== curYm || monthTotal <= 0) return null;
            const daysPassed = Math.max(1, now.getDate());
            const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const dailyAvg = Math.round(monthTotal / daysPassed);
            const projected = dailyAvg * totalDays;
            return (
              <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                TB: <strong className="font-mono text-[var(--text-primary)]">{dailyAvg.toLocaleString("vi-VN")} ₫/ngày</strong> · Dự báo cuối tháng:{" "}
                <strong className="font-mono text-[var(--accent)]">{projected.toLocaleString("vi-VN")} ₫</strong>
              </div>
            );
          })()}
          {momPct !== null && (
            <div className="mt-1 text-[11px] text-[var(--text-muted)]">
              So với tháng trước ({prevMonthPrefix}):{" "}
              <strong className={momPct <= 0 ? "text-emerald-600" : "text-rose-500"}>
                {momPct > 0 ? `+${momPct}%` : `${momPct}%`}
              </strong>
            </div>
          )}
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {monthTotal.toLocaleString("vi-VN")} ₫
          </div>
          {(() => {
            const pct = Math.min(120, Math.round((monthTotal / Math.max(1, monthlyBudget)) * 100));
            const over80 = pct >= 80;
            return (
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-muted)]">
                    Hạn mức tháng ({pct}%):
                  </span>
                  <input
                    type="number"
                    step={100000}
                    min={100000}
                    value={monthlyBudget}
                    onChange={(e) => updateBudget(Number(e.target.value))}
                    className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 text-right font-mono text-[11px] text-[var(--text-primary)]"
                  />
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 100 ? "bg-rose-500" : over80 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                {over80 && (
                  <div className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {pct >= 100 ? "Đã vượt ngân sách học tập tháng!" : "Sắp chạm hạn mức ngân sách tháng (≥80%)."}
                  </div>
                )}
              </div>
            );
          })()}
          {monthTotal > 0 && (() => {
            const mCats = CATEGORIES.map((c) => ({
              cat: c,
              sum: expenses
                .filter((e) => e.spentDate.startsWith(selectedMonth) && e.category === c)
                .reduce((a, b) => a + b.amount, 0),
            }))
              .filter((x) => x.sum > 0)
              .sort((a, b) => b.sum - a.sum);
            if (mCats.length === 0) return null;
            return (
              <div className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-2.5 text-[11px]">
                <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Tỷ trọng danh mục tháng này
                </div>
                {mCats.map((item) => {
                  const share = Math.round((item.sum / monthTotal) * 100);
                  return (
                    <div key={item.cat} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate text-[var(--text-secondary)]">{item.cat}</span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {share}% ({item.sum.toLocaleString("vi-VN")} ₫)
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        <div className="glass-card card-lift rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            {lang === "vi" ? "Tổng cộng đã ghi nhận" : "Total Recorded"}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {allTotal.toLocaleString("vi-VN")} ₫
          </div>
          {(() => {
            const curYr = new Date().toISOString().slice(0, 4);
            const yrTotal = expenses
              .filter((e) => e.spentDate.startsWith(curYr))
              .reduce((a, b) => a + b.amount, 0);
            return (
              <div className="mt-1.5 text-xs text-[var(--text-muted)]">
                Tổng năm {curYr}:{" "}
                <strong className="font-mono text-[var(--text-primary)]">
                  {yrTotal.toLocaleString("vi-VN")} ₫
                </strong>
              </div>
            );
          })()}
          {totalStudyHours > 0 && (
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Chi phí bình quân / giờ học (ROI):{" "}
              <strong className="font-mono text-[var(--accent)]">
                {Math.round(allTotal / Math.max(0.5, totalStudyHours)).toLocaleString("vi-VN")} ₫/giờ
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              {lang === "vi" ? "Ghi nhận chi tiêu học tập" : "Add Study Expense"}
            </h3>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              Xuất CSV (Excel)
            </button>
          </div>

          <form onSubmit={handleAdd} className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === "vi" ? "VD: Mua sách Giải thuật..." : "e.g., Algorithms textbook..."}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <input
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Số tiền (VNĐ)"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                {lang === "vi" ? "Lưu" : "Save"}
              </button>
            </div>
          </form>

          <ul className="mt-5 space-y-2">
            {expenses.length === 0 ? (
              <li className="text-xs text-[var(--text-muted)]">
                {lang === "vi" ? "Chưa có khoản chi nào." : "No expenses recorded yet."}
              </li>
            ) : (
              expenses.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{ex.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          ex.category.includes("Sách")
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                            : ex.category.includes("Khóa học")
                            ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            : ex.category.includes("In ấn")
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : ex.category.includes("Cà phê")
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {ex.category}
                      </span>
                      <span>{ex.spentDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">
                      {ex.amount.toLocaleString("vi-VN")} ₫
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(ex.id)}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="glass-card card-lift rounded-2xl p-6 lg:col-span-5">
          <h3 className="text-base font-medium text-[var(--text-primary)]">
            {lang === "vi" ? "Phân bổ theo danh mục" : "Spending by Category"}
          </h3>
          <ul className="mt-4 space-y-3">
            {byCat.length === 0 ? (
              <li className="text-xs text-[var(--text-muted)]">
                {lang === "vi" ? "Thêm khoản chi để xem biểu đồ." : "Add expenses to see breakdown."}
              </li>
            ) : (
              byCat.map((item) => {
                const pct = allTotal > 0 ? Math.round((item.sum / allTotal) * 100) : 0;
                return (
                  <li key={item.cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-primary)]">{item.cat}</span>
                      <span className="font-mono text-[var(--text-muted)]">
                        {item.sum.toLocaleString("vi-VN")} ₫ ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="progress-sheen h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      {/* MỤC TIÊU TIẾT KIỆM HỌC TẬP (STUDY SAVINGS GOAL) */}
      <section className="glass-card card-lift rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-emerald-500" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              Quỹ tiết kiệm mục tiêu học tập
            </h3>
          </div>
          <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {savingsCurrent.toLocaleString("vi-VN")} / {savingsTarget.toLocaleString("vi-VN")} ₫ (
            {Math.min(100, Math.round((savingsCurrent / Math.max(1, savingsTarget)) * 100))}%)
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(100, Math.round((savingsCurrent / Math.max(1, savingsTarget)) * 100))}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            value={savingsName}
            onChange={(e) => persistSavings(e.target.value, savingsTarget, savingsCurrent)}
            className="min-w-[160px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
          />
          <input
            type="number"
            step={100000}
            value={savingsTarget}
            onChange={(e) => persistSavings(savingsName, Math.max(100000, Number(e.target.value)), savingsCurrent)}
            className="w-32 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={() => persistSavings(savingsName, savingsTarget, savingsCurrent + 100000)}
            className="btn-primary rounded-xl px-3 py-1.5 text-xs font-medium"
          >
            +100k
          </button>
          <button
            type="button"
            onClick={() => persistSavings(savingsName, savingsTarget, Math.max(0, savingsCurrent - 100000))}
            className="rounded-xl border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]"
          >
            -100k
          </button>
        </div>
      </section>
    </div>
  );
}
