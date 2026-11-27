"use client";

import { kfNotify } from "@/lib/notify";

import { useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Trash2, Upload, X } from "lucide-react";
import type { SubjectOption } from "./PomodoroTimer";

interface ParsedCard {
  front: string;
  back: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === "\t") && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch ?? "";
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCardsFromFile(fileName: string, rawText: string): ParsedCard[] {
  const text = rawText.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const lower = fileName.toLowerCase();

  // 1. JSON format
  if (lower.endsWith(".json") || text.startsWith("[")) {
    try {
      const arr = JSON.parse(text) as unknown[];
      if (Array.isArray(arr)) {
        const cards: ParsedCard[] = [];
        for (const item of arr) {
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            const f = String(obj.front ?? obj.question ?? obj.q ?? obj.term ?? "").trim();
            const b = String(obj.back ?? obj.answer ?? obj.a ?? obj.definition ?? "").trim();
            if (f && b) cards.push({ front: f.slice(0, 400), back: b.slice(0, 1000) });
          }
        }
        return cards;
      }
    } catch {
      // fall through to text parser
    }
  }

  // 2. Q:/A: or Hỏi:/Đáp: multi-line blocks
  if (/^(?:Q|Câu hỏi|Hỏi)\s*:/im.test(text) && /^(?:A|Đáp án|Đáp|Trả lời)\s*:/im.test(text)) {
    const cards: ParsedCard[] = [];
    const lines = text.split(/\r?\n/);
    let curQ = "";
    let curA = "";
    const flush = () => {
      if (curQ.trim() && curA.trim()) {
        cards.push({ front: curQ.trim().slice(0, 400), back: curA.trim().slice(0, 1000) });
      }
      curQ = "";
      curA = "";
    };
    for (const ln of lines) {
      const qm = ln.match(/^(?:Q|Câu hỏi|Hỏi)\s*:\s*(.*)$/i);
      const am = ln.match(/^(?:A|Đáp án|Đáp|Trả lời)\s*:\s*(.*)$/i);
      if (qm) {
        if (curQ && curA) flush();
        curQ = (qm[1] ?? "").trim();
      } else if (am) {
        curA = (am[1] ?? "").trim();
      } else if (ln.trim()) {
        if (curA) curA += " " + ln.trim();
        else if (curQ) curQ += " " + ln.trim();
      }
    }
    flush();
    if (cards.length > 0) return cards;
  }

  // 3. CSV / TSV / Delimited lines (::, |, ;, tab, comma)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cards: ParsedCard[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? "";
    let front = "";
    let back = "";

    if (line.includes("::")) {
      const parts = line.split("::");
      front = (parts[0] ?? "").trim();
      back = parts.slice(1).join("::").trim();
    } else if (line.includes("|")) {
      const parts = line.split("|");
      front = (parts[0] ?? "").trim();
      back = parts.slice(1).join("|").trim();
    } else if (line.includes(";")) {
      const parts = line.split(";");
      front = (parts[0] ?? "").trim();
      back = parts.slice(1).join(";").trim();
    } else if (lower.endsWith(".csv") || lower.endsWith(".tsv") || line.includes(",") || line.includes("\t")) {
      const cols = parseCsvLine(line);
      front = cols[0] ?? "";
      back = cols.slice(1).join(", ").trim();
    }

    // Skip common header row on line 0
    if (
      idx === 0 &&
      /^(front|question|term|câu hỏi|mặt trước|cau hoi|mat truoc)$/i.test(front)
    ) {
      continue;
    }

    if (front && back) {
      cards.push({ front: front.slice(0, 400), back: back.slice(0, 1000) });
    }
  }
  return cards;
}

export function FlashcardFileImportModal({
  open,
  onClose,
  subjects,
  existingFronts,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectOption[];
  existingFronts: string[];
  onImported: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [preview, setPreview] = useState<ParsedCard[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  if (!open) return null;

  const existingSet = new Set(existingFronts.map((s) => s.trim().toLowerCase()));
  const filteredPreview = skipDuplicates
    ? preview.filter((c) => !existingSet.has(c.front.trim().toLowerCase()))
    : preview;
  const dupCount = preview.length - filteredPreview.length;

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const cards = parseCardsFromFile(file.name, String(reader.result ?? ""));
      if (cards.length === 0) {
        setErrorMsg("Không tách được câu hỏi nào. Hãy kiểm tra định dạng theo tệp mẫu (.csv hoặc .txt).");
      }
      setPreview(cards);
    };
    reader.onerror = () => setErrorMsg("Không thể đọc tệp vừa chọn.");
    reader.readAsText(file, "utf-8");
  };

  const downloadSample = (type: "csv" | "txt") => {
    const content =
      type === "csv"
        ? '\uFEFFFront,Back\n"Lạm phát cầu kéo là gì?","Là lạm phát xảy ra khi tổng cầu tăng vượt quá năng lực sản xuất của nền kinh tế."\n"Độ phức tạp tìm kiếm nhị phân?","O(log n) trên mảng đã sắp xếp."'
        : "Q: Luật giá trị yêu cầu gì?\nA: Sản xuất và trao đổi hàng hóa dựa trên cơ sở hao phí lao động xã hội cần thiết.\n\nQ: Công thức tính lãi kép?\nA: A = P * (1 + r)^n";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-flashcards-sample.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAll = async () => {
    if (filteredPreview.length === 0) return;
    setSaving(true);
    setProgress(0);
    setErrorMsg("");
    let okCount = 0;
    try {
      for (let i = 0; i < filteredPreview.length; i++) {
        const card = filteredPreview[i];
        if (!card) continue;
        const res = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: card.front,
            back: card.back,
            subjectId: subjectId || null,
          }),
        });
        if (res.ok) okCount += 1;
        setProgress(i + 1);
      }
      onImported();
      kfNotify(`Đã nhập thành công ${okCount}/${filteredPreview.length} thẻ Flashcard!`);
      setPreview([]);
      setFileName("");
      onClose();
    } catch {
      setErrorMsg("Có lỗi kết nối khi lưu thẻ lên máy chủ.");
    } finally {
      setSaving(false);
    }
  };

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
            <FileSpreadsheet className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Nhập nhanh Flashcard từ tệp câu hỏi
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Hỗ trợ .CSV, .TSV, .TXT, .MD (Q:/A:, Hỏi:/Đáp:, ::, |, ;) và .JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadSample("csv")}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5" /> Tải mẫu .CSV
            </button>
            <button
              type="button"
              onClick={() => downloadSample("txt")}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5" /> Tải mẫu .TXT (Q/A)
            </button>
          </div>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">Chung (không gắn môn)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-6 text-center hover:border-[var(--accent)]">
          <Upload className="mb-1.5 h-6 w-6 text-[var(--accent)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">
            {fileName ? `Đã chọn: ${fileName}` : "Nhấn để chọn tệp câu hỏi (.csv, .txt, .md, .json)"}
          </span>
          <span className="mt-1 text-[11px] text-[var(--text-muted)]">
            Tự động nhận diện cột Câu hỏi / Đáp án và cho xem trước trước khi lưu
          </span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.md,.json,text/plain,text/csv,application/json"
            className="hidden"
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
            {errorMsg}
          </div>
        )}

        {preview.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[var(--text-primary)]">
                Xem trước: <strong>{filteredPreview.length}</strong> thẻ hợp lệ
                {dupCount > 0 && <span className="ml-1 text-amber-600">(đã lọc {dupCount} thẻ trùng)</span>}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Bỏ qua thẻ trùng mặt trước
              </label>
            </div>

            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {filteredPreview.map((c, i) => (
                <div
                  key={`${i}-${c.front.slice(0, 16)}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-semibold text-[var(--text-primary)]">
                      #{i + 1}. {c.front}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{c.back}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreview((prev) => prev.filter((x) => x !== c))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || filteredPreview.length === 0}
                onClick={handleSaveAll}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {saving
                  ? `Đang lưu ${progress}/${filteredPreview.length}...`
                  : `Lưu ${filteredPreview.length} thẻ vào bộ ôn tập`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
