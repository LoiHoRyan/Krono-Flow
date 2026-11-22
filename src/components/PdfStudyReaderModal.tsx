"use client";

import { useEffect, useState } from "react";
import { FileUp, Save, X, BookOpen } from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";

export function PdfStudyReaderModal({
  open,
  subjects,
  onClose,
  onSaved,
}: {
  open: boolean;
  subjects: SubjectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setFileName(file.name);
    if (!noteTitle) setNoteTitle(`Tóm tắt: ${file.name.replace(/\.pdf$/i, "")}`);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle.trim(),
          content: noteContent.trim(),
          subjectId: subjectId || null,
        }),
      });
      if (res.ok) {
        setMsg("Đã lưu ghi chú vào PostgreSQL!");
        onSaved();
        setTimeout(() => setMsg(null), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Đọc PDF song song Ghi chú {fileName ? `— ${fileName}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-primary inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium">
            <FileUp className="h-3.5 w-3.5" />
            Chọn tệp PDF từ máy
            <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-12">
        <div className="flex h-full flex-col border-b border-[var(--border-subtle)] bg-zinc-900/5 lg:col-span-7 lg:border-b-0 lg:border-r">
          {pdfUrl ? (
            <iframe src={pdfUrl} title="PDF Study Reader" className="h-full min-h-[420px] w-full" />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <FileUp className="h-10 w-10 text-[var(--text-muted)]" />
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                Mở giáo trình, slide hoặc đề thi PDF ngay tại đây
              </p>
              <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
                Tệp PDF được hiển thị trực tiếp trên trình duyệt của bạn, không tải lên máy chủ nên cực nhanh và riêng tư.
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSaveNote}
          className="flex h-full flex-col gap-3 overflow-y-auto bg-[var(--bg-surface)] p-5 lg:col-span-5"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Ghi chú Markdown song song
          </div>
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Tiêu đề ghi chú..."
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)]"
          >
            <option value="">-- Gắn môn học (tùy chọn) --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Ghi ý chính, công thức, câu hỏi cần ôn lại từ tài liệu PDF..."
            className="min-h-[280px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-emerald-600">{msg ?? ""}</span>
            <button
              type="submit"
              disabled={saving || !noteTitle.trim() || !noteContent.trim()}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Đang lưu..." : "Lưu ghi chú"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
