"use client";

import { useState } from "react";
import { CheckSquare, FileText, Layers, Plus, Wallet, X } from "lucide-react";
import { cn, getLocalDateIso } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

type CaptureKind = "todo" | "note" | "card" | "expense";

export function QuickCaptureModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { lang } = useLang();
  const [kind, setKind] = useState<CaptureKind>("todo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [amount, setAmount] = useState("50000");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let ok = false;
      if (kind === "todo") {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), priority: "medium" }),
        });
        ok = res.ok;
      } else if (kind === "note") {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: body.trim() || title.trim(),
          }),
        });
        ok = res.ok;
      } else if (kind === "card") {
        const res = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: title.trim(),
            back: body.trim() || "...",
          }),
        });
        ok = res.ok;
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            amount: Number(amount) || 10000,
            category: "Khác",
            spentDate: getLocalDateIso(),
          }),
        });
        ok = res.ok;
      }

      if (ok) {
        setTitle("");
        setBody("");
        onSuccess(lang === "vi" ? "Đã lưu nhanh vào PostgreSQL!" : "Quick saved to PostgreSQL!");
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {lang === "vi" ? "Thêm nhanh (Phím Q)" : "Quick Capture (Key Q)"}
          </span>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px]">
          {(
            [
              { id: "todo", label: "Việc", icon: CheckSquare },
              { id: "note", label: "Ghi chú", icon: FileText },
              { id: "card", label: "Thẻ nhớ", icon: Layers },
              { id: "expense", label: "Chi tiêu", icon: Wallet },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2 font-medium",
                  kind === item.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="text"
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "todo"
                ? "Tên công việc cần làm..."
                : kind === "note"
                ? "Tiêu đề ghi chú..."
                : kind === "card"
                ? "Mặt trước (Câu hỏi / Từ vựng)..."
                : "Tên khoản chi tiêu..."
            }
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />

          {(kind === "note" || kind === "card") && (
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                kind === "note" ? "Nội dung ghi chú..." : "Mặt sau (Đáp án / Giải thích)..."
              }
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          )}

          {kind === "expense" && (
            <input
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Số tiền (VNĐ)"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)]"
            />
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu ngay"}
          </button>
        </form>
      </div>
    </div>
  );
}
