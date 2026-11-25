"use client";

import { useEffect, useState } from "react";
import { BookMarked, Clock, Copy, Plus, Trash2, X } from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";

interface FormulaItem {
  id: string;
  subjectName: string;
  title: string;
  body: string;
}

type ConfLevel = "low" | "mid" | "high";

const FORMULAS_KEY = "kronoflow-formulas-v1";
const ALLOC_CONF_KEY = "kronoflow-alloc-conf-v1";

export function StudyAllocatorModal({
  open,
  onClose,
  subjects,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
}) {
  const [tab, setTab] = useState<"formulas" | "allocator">("formulas");

  // Formulas Pinboard
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);
  const [subName, setSubName] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fBody, setFBody] = useState("");
  const [query, setQuery] = useState("");

  // Study Hour Allocator
  const [totalHours, setTotalHours] = useState(20);
  const [confMap, setConfMap] = useState<Record<string, ConfLevel>>({});

  useEffect(() => {
    try {
      const rawF = localStorage.getItem(FORMULAS_KEY);
      if (rawF) setFormulas(JSON.parse(rawF) as FormulaItem[]);
      const rawC = localStorage.getItem(ALLOC_CONF_KEY);
      if (rawC) setConfMap(JSON.parse(rawC) as Record<string, ConfLevel>);
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

  const saveFormulas = (next: FormulaItem[]) => {
    setFormulas(next);
    try {
      localStorage.setItem(FORMULAS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const saveConf = (next: Record<string, ConfLevel>) => {
    setConfMap(next);
    try {
      localStorage.setItem(ALLOC_CONF_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleAddFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim() || !fBody.trim()) return;
    const item: FormulaItem = {
      id: `${Date.now()}`,
      subjectName: subName.trim() || "Chung",
      title: fTitle.trim(),
      body: fBody.trim(),
    };
    saveFormulas([item, ...formulas]);
    setFTitle("");
    setFBody("");
  };

  const filteredFormulas = formulas.filter((f) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      f.title.toLowerCase().includes(q) ||
      f.body.toLowerCase().includes(q) ||
      f.subjectName.toLowerCase().includes(q)
    );
  });

  const weightOf = (lv: ConfLevel) => (lv === "low" ? 3 : lv === "mid" ? 2 : 1);
  const totalWeight = subjects.reduce((a, s) => a + weightOf(confMap[s.id] ?? "mid"), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Sổ tay Công thức & Phân bổ Giờ ôn thi
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

        <div className="mt-3 flex gap-1.5 rounded-xl bg-[var(--bg-elevated)] p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("formulas")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 ${
              tab === "formulas" ? "bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            <BookMarked className="h-3.5 w-3.5" /> Sổ tay Công thức ({formulas.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("allocator")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 ${
              tab === "allocator" ? "bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Phân bổ Giờ ôn thi
          </button>
        </div>

        {tab === "formulas" ? (
          <div className="mt-4 space-y-3 text-xs">
            <form onSubmit={handleAddFormula} className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  required
                  placeholder="Tên công thức / định lý (VD: Giá trị hiện tại PV)..."
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
                />
                <input
                  type="text"
                  list="kronoflow-formula-subjects"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Môn học (VD: Tài chính - Tiền tệ)..."
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
                />
                <datalist id="kronoflow-formula-subjects">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <textarea
                rows={2}
                required
                value={fBody}
                onChange={(e) => setFBody(e.target.value)}
                placeholder="Nội dung công thức / cú pháp / ghi chú ngắn..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 font-mono text-[11px]"
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Lưu công thức
              </button>
            </form>

            {formulas.length > 0 && (
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm nhanh theo tên môn hoặc công thức..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs"
              />
            )}

            <div className="space-y-2">
              {filteredFormulas.length === 0 ? (
                <p className="py-4 text-center text-[var(--text-muted)]">
                  Chưa có công thức nào. Hãy ghim lại các công thức hay quên để tra cứu trong 1 giây!
                </p>
              ) : (
                filteredFormulas.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">{f.title}</span>
                        <span className="ml-2 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                          {f.subjectName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(`${f.title}: ${f.body}`).catch(() => {})}
                          title="Sao chép"
                          className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => saveFormulas(formulas.filter((x) => x.id !== f.id))}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[11px] text-[var(--accent)]">
                      {f.body}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <span className="font-medium text-[var(--text-primary)]">
                Tổng quỹ giờ ôn thi còn lại:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={totalHours}
                  onChange={(e) => setTotalHours(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-right font-semibold"
                />
                <span className="text-[var(--text-muted)]">giờ</span>
              </div>
            </div>

            {subjects.length === 0 ? (
              <p className="py-4 text-center text-[var(--text-muted)]">
                Hãy thêm môn học ở tab Môn học & Todo để hệ thống chia giờ ôn tự động.
              </p>
            ) : (
              <div className="space-y-2">
                {subjects.map((sub) => {
                  const lv = confMap[sub.id] ?? "mid";
                  const share = totalWeight > 0 ? weightOf(lv) / totalWeight : 0;
                  const hrs = Math.round(totalHours * share * 10) / 10;
                  return (
                    <div
                      key={sub.id}
                      className="space-y-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                          <span>{sub.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={lv}
                            onChange={(e) =>
                              saveConf({ ...confMap, [sub.id]: e.target.value as ConfLevel })
                            }
                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px]"
                          >
                            <option value="low">Chưa chắc (ưu tiên ×3)</option>
                            <option value="mid">Tạm ổn (×2)</option>
                            <option value="high">Đã vững (×1)</option>
                          </select>
                          <span className="font-mono font-bold text-[var(--accent)]">
                            {hrs}h ({Math.round(share * 100)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(share * 100)}%`, backgroundColor: sub.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
