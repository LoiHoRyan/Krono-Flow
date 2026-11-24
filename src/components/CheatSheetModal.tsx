"use client";

import { useEffect, useState } from "react";
import { Code2, Copy, Check, Plus, Trash2, Search, X } from "lucide-react";

interface SnippetItem {
  id: string;
  title: string;
  category: string;
  body: string;
}

const DEFAULT_SNIPPETS: SnippetItem[] = [
  {
    id: "acad-1",
    title: "Email xin phép / hỏi bài Giảng viên chuẩn mực",
    category: "Học thuật",
    body: "Kính gửi Thầy/Cô [Tên],\nEm là [Họ tên] - MSSV [Mã SV], lớp [Tên lớp]. Em viết email này xin phép được hỏi về [Nội dung]. Em rất mong nhận được phản hồi từ Thầy/Cô. Em xin trân trọng cảm ơn!",
  },
  {
    id: "acad-2",
    title: "Mẫu câu chuyển ý & kết luận Tiểu luận (EN)",
    category: "Học thuật",
    body: "Furthermore, empirical evidence suggests that... | In contrast to prior studies,... | Taken together, these findings highlight the critical role of...",
  },
  {
    id: "def-1",
    title: "Lãi kép & Giá trị tương lai (FV)",
    category: "Tài chính",
    body: "FV = PV × (1 + r)^n   |   PV = FV / (1 + r)^n",
  },
  {
    id: "def-2",
    title: "Độ phức tạp Big-O phổ biến",
    category: "Thuật toán",
    body: "Binary Search: O(log n) | Merge/QuickSort: O(n log n) | Hash Lookup: O(1) avg",
  },
  {
    id: "def-3",
    title: "Git đồng bộ nhanh",
    category: "Công cụ",
    body: 'git add . && git commit -m "feat: update workspace" && git push',
  },
];

export function CheatSheetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<SnippetItem[]>(DEFAULT_SNIPPETS);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Công thức");
  const [body, setBody] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-cheatsheets");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

  const persist = (next: SnippetItem[]) => {
    setItems(next);
    localStorage.setItem("kronoflow-cheatsheets", JSON.stringify(next));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    persist([
      { id: String(Date.now()), title: title.trim(), category: category.trim() || "Khác", body: body.trim() },
      ...items,
    ]);
    setTitle("");
    setBody("");
  };

  const copyBody = (item: SnippetItem) => {
    navigator.clipboard?.writeText(item.body).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 1500);
  };

  const filtered = items.filter(
    (x) =>
      x.title.toLowerCase().includes(query.toLowerCase()) ||
      x.category.toLowerCase().includes(query.toLowerCase()) ||
      x.body.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Kho Công thức & Đoạn mã tra nhanh (Cheat-Sheet)
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

        <form onSubmit={addItem} className="mt-3 grid gap-2 sm:grid-cols-12">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên công thức / ghi nhớ..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] sm:col-span-5"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Nhóm (Toán, Code...)"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] sm:col-span-3"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium sm:col-span-4"
          >
            <Plus className="h-3.5 w-3.5" /> Lưu vào kho
          </button>
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nội dung công thức, lệnh hoặc đoạn mã..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 font-mono text-xs text-[var(--text-primary)] sm:col-span-12"
          />
        </form>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhanh công thức, nhóm môn..."
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </span>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyBody(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Chép
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => persist(items.filter((x) => x.id !== item.id))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--bg-surface)] p-2 font-mono text-[11px] text-[var(--text-secondary)]">
                {item.body}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
