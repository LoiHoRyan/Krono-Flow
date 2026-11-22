"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  BookmarkPlus,
  Copy,
  KeyRound,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { MarkdownView } from "./MarkdownView";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS_VI = [
  "Lập kế hoạch học tập tối ưu cho hôm nay",
  "Phân tích lỗi sai chưa khắc phục của tôi",
  "Gợi ý chiến lược ôn thi gần nhất",
  "Giải thích ngắn gọn kỹ thuật Active Recall & Spaced Repetition",
];

const QUICK_PROMPTS_EN = [
  "Build an optimal study plan for me today",
  "Analyze my unresolved mistakes",
  "Suggest an exam prep strategy",
  "Briefly explain Active Recall & Spaced Repetition",
];

export function AiCopilotDrawer({
  open,
  onClose,
  onNotify,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
  onRefresh: () => void;
}) {
  const { lang } = useLang();
  const [aiTab, setAiTab] = useState<"chat" | "flashcards" | "roadmap">("chat");
  const [rmGoal, setRmGoal] = useState("");
  const [rmGenerating, setRmGenerating] = useState(false);
  const [rmPreview, setRmPreview] = useState<{ title: string; category: string; items: { title: string; estimatedMinutes: number }[] } | null>(null);
  const [fcTopic, setFcTopic] = useState("");
  const [fcCount, setFcCount] = useState(5);
  const [fcGenerating, setFcGenerating] = useState(false);
  const [fcPreview, setFcPreview] = useState<{ front: string; back: string }[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [userKey, setUserKey] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("kronoflow-gemini-key");
    if (saved) setUserKey(saved);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.data) setMessages(j.data);
        if (typeof j?.hasServerKey === "boolean") setHasServerKey(j.hasServerKey);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  if (!open) return null;

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;

    const tempUser: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: clean };
    setMessages((prev) => [...prev, tempUser]);
    setInput("");
    setSending(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userKey.trim()) headers["x-gemini-key"] = userKey.trim();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: clean }),
      });
      const json = await res.json();
      if (res.ok && json.reply) {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: json.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: json.error ?? "Không thể phản hồi lúc này.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: "Lỗi kết nối máy chủ." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSaveAsNote = async (content: string) => {
    const title = `AI Copilot · ${new Date().toLocaleDateString("vi-VN")}`;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      onNotify(lang === "vi" ? "Đã lưu câu trả lời AI thành Ghi chú!" : "Saved AI reply as Note!");
      onRefresh();
    }
  };

  const handleGenerateFlashcards = async (saveNow: boolean) => {
    if (!fcTopic.trim() || fcGenerating) return;
    setFcGenerating(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userKey.trim()) headers["x-gemini-key"] = userKey.trim();
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers,
        body: JSON.stringify({ topic: fcTopic.trim(), count: fcCount, saveImmediately: saveNow }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setFcPreview(json.data);
        if (saveNow) {
          onNotify(`Đã lưu ${json.data.length} thẻ Flashcards vào PostgreSQL!`);
          onRefresh();
        }
      }
    } finally {
      setFcGenerating(false);
    }
  };

  const handleSavePreviewCards = async () => {
    if (fcPreview.length === 0) return;
    setFcGenerating(true);
    try {
      for (const c of fcPreview) {
        await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front: c.front, back: c.back }),
        });
      }
      onNotify(`Đã lưu ${fcPreview.length} thẻ Flashcards vào kho!`);
      setFcPreview([]);
      setFcTopic("");
      onRefresh();
    } finally {
      setFcGenerating(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!rmGoal.trim() || rmGenerating) return;
    setRmGenerating(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userKey.trim()) headers["x-gemini-key"] = userKey.trim();
      const res = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers,
        body: JSON.stringify({ goal: rmGoal.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.data) setRmPreview(json.data);
    } finally {
      setRmGenerating(false);
    }
  };

  const handleSaveRoadmap = async () => {
    if (!rmPreview) return;
    setRmGenerating(true);
    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rmPreview),
      });
      if (res.ok) {
        onNotify("Đã lưu Lộ trình AI vào Kho Lộ Trình PostgreSQL!");
        setRmPreview(null);
        setRmGoal("");
        onRefresh();
      }
    } finally {
      setRmGenerating(false);
    }
  };

  const handleClear = async () => {
    await fetch("/api/ai/chat", { method: "DELETE" });
    setMessages([]);
  };

  const saveUserKey = (val: string) => {
    setUserKey(val);
    if (val.trim()) localStorage.setItem("kronoflow-gemini-key", val.trim());
    else localStorage.removeItem("kronoflow-gemini-key");
  };

  const aiReady = hasServerKey || Boolean(userKey.trim());
  const quickPrompts = lang === "vi" ? QUICK_PROMPTS_VI : QUICK_PROMPTS_EN;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="animate-slide-right flex h-full w-full max-w-lg flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="btn-primary inline-flex h-8 w-8 items-center justify-center rounded-xl">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  KronoFlow AI Copilot
                </h3>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    aiReady
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {aiReady ? "Gemini 2.5" : "Local Coach"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {lang === "vi"
                  ? "Hiểu lịch học, kỳ thi & lỗi sai của bạn"
                  : "Context-aware PostgreSQL study assistant"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowKeyBox((v) => !v)}
              title="Cấu hình Gemini API Key"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              title="Xóa lịch sử trò chuyện"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional API Key config bar */}
        {showKeyBox && (
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 py-3 text-xs">
            <label className="font-medium text-[var(--text-primary)]">
              Gemini API Key (tùy chọn — lưu cục bộ trên trình duyệt)
            </label>
            <input
              type="password"
              value={userKey}
              onChange={(e) => saveUserKey(e.target.value)}
              placeholder="AIza... (lấy miễn phí tại aistudio.google.com)"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        {/* Mode Switch: Chat vs AI Flashcards */}
        <div className="flex gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-5 py-2 text-xs">
          <button
            type="button"
            onClick={() => setAiTab("chat")}
            className={cn(
              "rounded-lg px-3 py-1 font-medium",
              aiTab === "chat"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Trò chuyện AI
          </button>
          <button
            type="button"
            onClick={() => setAiTab("flashcards")}
            className={cn(
              "rounded-lg px-3 py-1 font-medium",
              aiTab === "flashcards"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            ✦ Flashcards AI
          </button>
          <button
            type="button"
            onClick={() => setAiTab("roadmap")}
            className={cn(
              "rounded-lg px-3 py-1 font-medium",
              aiTab === "roadmap"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            ✦ Lộ trình AI
          </button>
        </div>

        {aiTab === "roadmap" ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">
                Nhập mục tiêu học tập (AI sẽ tự chia chặng & thời lượng)
              </label>
              <input
                type="text"
                value={rmGoal}
                onChange={(e) => setRmGoal(e.target.value)}
                placeholder="VD: Ôn thi C++ & Cấu trúc dữ liệu trong 14 ngày"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                disabled={rmGenerating || !rmGoal.trim()}
                onClick={handleGenerateRoadmap}
                className="btn-primary rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
              >
                {rmGenerating ? "Đang tạo lộ trình..." : "Tạo lộ trình AI"}
              </button>
            </div>

            {rmPreview && (
              <div className="space-y-2.5 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {rmPreview.title} ({rmPreview.items.length} chặng)
                  </span>
                  <button
                    type="button"
                    disabled={rmGenerating}
                    onClick={handleSaveRoadmap}
                    className="btn-primary rounded-xl px-3.5 py-1.5 text-xs font-medium"
                  >
                    Lưu vào Kho Lộ Trình
                  </button>
                </div>
                {rmPreview.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                  >
                    <span className="text-[var(--text-primary)]">
                      {idx + 1}. {it.title}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--accent)]">
                      {it.estimatedMinutes}p
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : aiTab === "flashcards" ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2.5">
              <label className="text-xs font-medium text-[var(--text-primary)]">
                Nhập tên chủ đề hoặc dán đoạn bài giảng
              </label>
              <textarea
                rows={4}
                value={fcTopic}
                onChange={(e) => setFcTopic(e.target.value)}
                placeholder="VD: Các thuật toán sắp xếp cơ bản (QuickSort, MergeSort, HeapSort)..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={fcCount}
                  onChange={(e) => setFcCount(Number(e.target.value))}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs"
                >
                  <option value={5}>5 thẻ Flashcards</option>
                  <option value={8}>8 thẻ Flashcards</option>
                  <option value={10}>10 thẻ Flashcards</option>
                </select>
                <button
                  type="button"
                  disabled={fcGenerating || !fcTopic.trim()}
                  onClick={() => handleGenerateFlashcards(false)}
                  className="btn-primary rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
                >
                  {fcGenerating ? "Đang tạo..." : "Sinh bộ thẻ"}
                </button>
              </div>
            </div>

            {fcPreview.length > 0 && (
              <div className="space-y-2.5 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Xem trước ({fcPreview.length} thẻ)
                  </span>
                  <button
                    type="button"
                    disabled={fcGenerating}
                    onClick={handleSavePreviewCards}
                    className="btn-primary rounded-xl px-3.5 py-1.5 text-xs font-medium"
                  >
                    Lưu tất cả vào PostgreSQL
                  </button>
                </div>
                {fcPreview.map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
                  >
                    <div className="font-semibold text-[var(--text-primary)]">Q: {c.front}</div>
                    <div className="mt-1 text-[var(--text-secondary)]">A: {c.back}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Messages Area */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {lang === "vi" ? "Chào bạn! Mình giúp gì được hôm nay?" : "How can I help you study today?"}
                </h4>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {lang === "vi"
                    ? "Chọn nhanh gợi ý bên dưới hoặc hỏi bất kỳ kiến thức nào."
                    : "Pick a quick prompt below or ask any study question."}
                </p>
              </div>
              <div className="grid gap-2 text-left">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => sendMessage(qp)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] hover:border-[var(--accent)]"
                  >
                    ✦ {qp}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs",
                    m.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                  )}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <MarkdownView content={m.content} />
                  )}
                </div>

                {m.role === "assistant" && (
                  <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-[var(--text-muted)]">
                    <button
                      type="button"
                      onClick={() => handleSaveAsNote(m.content)}
                      className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
                    >
                      <BookmarkPlus className="h-3 w-3" />
                      Lưu thành Ghi chú
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(m.content).catch(() => {});
                        onNotify("Đã sao chép câu trả lời!");
                      }}
                      className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
                    >
                      <Copy className="h-3 w-3" />
                      Sao chép
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:240ms]" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-[var(--border-subtle)] p-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === "vi" ? "Hỏi AI Copilot bất cứ điều gì..." : "Ask AI Copilot anything..."
              }
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2.5 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
        </>
        )}
      </aside>
    </div>
  );
}
