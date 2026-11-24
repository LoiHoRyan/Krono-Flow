"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Layers,
  Pin,
  Plus,
  RotateCw,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Pencil,
  Download,
  Maximize2,
  AlertTriangle,
  X,
  Volume2,
  Columns2,
  BookOpen,
  Upload,
  Sparkles,
  StickyNote,
  Gamepad2,
  PlayCircle,
  Printer,
  Hash,
  Zap,
  Mic,
  MicOff,
  Shuffle,
  BookA,
} from "lucide-react";
import { cn, normalizeVi } from "@/lib/utils";
import { MarkdownView } from "./MarkdownView";
import { PdfStudyReaderModal } from "./PdfStudyReaderModal";
import { playUiTick } from "@/lib/ui-sounds";
import type { SubjectOption } from "./PomodoroTimer";

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  subjectId: string | null;
  updatedAt: string;
}

export interface MistakeRecord {
  id: string;
  question: string;
  reason: string;
  solution: string;
  resolved: boolean;
  subjectId: string | null;
}

export interface FlashcardRecord {
  id: string;
  front: string;
  back: string;
  mastery: number;
  nextReviewAt?: string;
  subjectId: string | null;
}

export function NotesFlashcardsPanel({
  subjects,
  notes,
  flashcards,
  mistakes = [],
  onUndoableDelete,
  onFocusNote,
  onRefresh,
}: {
  subjects: SubjectOption[];
  notes: NoteRecord[];
  flashcards: FlashcardRecord[];
  mistakes?: MistakeRecord[];
  onUndoableDelete?: (label: string, onUndo: () => Promise<void>) => void;
  onFocusNote?: (title: string) => void;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"notes" | "flashcards" | "quiz" | "typing" | "mistakes" | "feynman" | "match" | "tf" | "glossary">("notes");
  const [readerFont, setReaderFont] = useState<"sans" | "serif" | "mono">("sans");
  const [glossary, setGlossary] = useState<{ id: string; term: string; def: string; ex: string }[]>([]);
  const [gTerm, setGTerm] = useState("");
  const [gDef, setGDef] = useState("");
  const [gEx, setGEx] = useState("");
  const [gLetter, setGLetter] = useState("ALL");

  useEffect(() => {
    try {
      const rawG = localStorage.getItem("kronoflow-glossary");
      if (rawG) setGlossary(JSON.parse(rawG));
      const lastSub = localStorage.getItem("kronoflow-last-subject");
      if (lastSub) {
        setNoteSubject(lastSub);
        setCardSubject(lastSub);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGlossary = (next: { id: string; term: string; def: string; ex: string }[]) => {
    setGlossary(next);
    localStorage.setItem("kronoflow-glossary", JSON.stringify(next));
  };
  const [tfSec, setTfSec] = useState(30);
  const [tfScore, setTfScore] = useState(0);
  const [tfRound, setTfRound] = useState<{ front: string; shownBack: string; isTrue: boolean } | null>(null);

  const nextTfRound = () => {
    if (flashcards.length < 2) {
      setTfRound(null);
      return;
    }
    const card = flashcards[Math.floor(Math.random() * flashcards.length)];
    if (!card) return;
    const makeTrue = Math.random() >= 0.5;
    if (makeTrue) {
      setTfRound({ front: card.front, shownBack: card.back, isTrue: true });
    } else {
      const others = flashcards.filter((c) => c.id !== card.id);
      const fake = others[Math.floor(Math.random() * others.length)] ?? card;
      setTfRound({ front: card.front, shownBack: fake.back, isTrue: fake.back === card.back });
    }
  };

  const startTfDrill = () => {
    setTfScore(0);
    setTfSec(30);
    setSubTab("tf");
    nextTfRound();
  };

  useEffect(() => {
    if (subTab !== "tf" || tfSec <= 0) return;
    const id = setInterval(() => setTfSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [subTab, tfSec]);

  const exportFlashcardsCsv = () => {
    const rows = flashcards
      .map((c) => `"${c.front.replaceAll('"', '""')}","${c.back.replaceAll('"', '""')}"`)
      .join("\n");
    const blob = new Blob(["\uFEFFFront,Back\n" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-flashcards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [matchTiles, setMatchTiles] = useState<{ id: string; cardId: string; side: "front" | "back"; text: string }[]>([]);
  const [matchPicked, setMatchPicked] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchSec, setMatchSec] = useState(60);

  const startMatchGame = () => {
    const sample = flashcards.slice(0, 6);
    const tiles: { id: string; cardId: string; side: "front" | "back"; text: string }[] = [];
    for (const c of sample) {
      tiles.push({ id: `f-${c.id}`, cardId: c.id, side: "front", text: c.front });
      tiles.push({ id: `b-${c.id}`, cardId: c.id, side: "back", text: c.back });
    }
    tiles.sort(() => Math.random() - 0.5);
    setMatchTiles(tiles);
    setMatchedIds([]);
    setMatchPicked(null);
    setMatchSec(60);
    setSubTab("match");
  };

  useEffect(() => {
    if (subTab !== "match" || matchTiles.length === 0 || matchedIds.length >= matchTiles.length / 2 || matchSec <= 0) return;
    const t = setInterval(() => setMatchSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [subTab, matchTiles.length, matchedIds.length, matchSec]);

  const pickMatchTile = (tile: { id: string; cardId: string; side: "front" | "back"; text: string }) => {
    if (matchedIds.includes(tile.cardId) || matchSec <= 0) return;
    if (!matchPicked) {
      setMatchPicked(tile.id);
      playUiTick("flip");
      return;
    }
    if (matchPicked === tile.id) {
      setMatchPicked(null);
      return;
    }
    const prev = matchTiles.find((x) => x.id === matchPicked);
    if (prev && prev.cardId === tile.cardId && prev.side !== tile.side) {
      setMatchedIds((arr) => [...arr, tile.cardId]);
      playUiTick("check");
    }
    setMatchPicked(null);
  };
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pastelMode, setPastelMode] = useState(false);
  const [mistakeLevel, setMistakeLevel] = useState<Record<string, "warn" | "hard" | "exam">>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-mistake-tags");
      if (raw) setMistakeLevel(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const cycleMistakeLevel = (id: string) => {
    const order: ("warn" | "hard" | "exam")[] = ["warn", "hard", "exam"];
    const cur = mistakeLevel[id] ?? "warn";
    const next = order[(order.indexOf(cur) + 1) % order.length] ?? "warn";
    const updated = { ...mistakeLevel, [id]: next };
    setMistakeLevel(updated);
    localStorage.setItem("kronoflow-mistake-tags", JSON.stringify(updated));
  };
  const [noteColors, setNoteColors] = useState<Record<string, string>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [feynmanConcept, setFeynmanConcept] = useState("");
  const [feynmanBody, setFeynmanBody] = useState("");
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  const [feynmanRes, setFeynmanRes] = useState<{
    clarityScore: number;
    strengths: string[];
    gaps: string[];
    analogy: string;
  } | null>(null);
  const [readingNote, setReadingNote] = useState<NoteRecord | null>(null);
  const [mQuestion, setMQuestion] = useState("");
  const [mReason, setMReason] = useState("");
  const [mSolution, setMSolution] = useState("");
  const [mSubject, setMSubject] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [typeResult, setTypeResult] = useState<"idle" | "right" | "wrong">("idle");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPicked, setQuizPicked] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const [deckSubject, setDeckSubject] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [bookPaperMode, setBookPaperMode] = useState(false);
  const [clozeMode, setClozeMode] = useState(false);
  const [notesTimeline, setNotesTimeline] = useState(false);
  const [wordTarget, setWordTarget] = useState(0);
  const [weakOnly, setWeakOnly] = useState(false);
  const [reverseCard, setReverseCard] = useState(false);
  const [compactNotes, setCompactNotes] = useState(false);
  const [noteAiFcBusy, setNoteAiFcBusy] = useState(false);
  const [slideMode, setSlideMode] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [blindRecall, setBlindRecall] = useState(false);
  const [blindText, setBlindText] = useState("");

  const printMistakesA4 = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = mistakes
      .map(
        (m, i) =>
          `<div style="border:1px solid #cbd5e1;border-radius:10px;padding:12px;margin-bottom:10px;break-inside:avoid;">
            <div style="font-weight:700;font-size:13px;">#${i + 1}. ${m.question.replaceAll("<", "&lt;")} ${m.resolved ? "(Đã vững)" : ""}</div>
            <div style="font-size:12px;color:#b91c1c;margin-top:4px;">Nguyên nhân: ${m.reason.replaceAll("<", "&lt;")}</div>
            <div style="font-size:12px;color:#047857;margin-top:4px;">Cách giải: ${m.solution.replaceAll("<", "&lt;")}</div>
          </div>`
      )
      .join("");
    win.document.write(`<html><head><title>Sổ Lỗi Sai KronoFlow</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:800px;margin:auto;}</style></head><body><h2>Sổ Lỗi Sai Ôn Thi (${mistakes.length} câu)</h2>${rows}<script>window.print();</script></body></html>`);
    win.document.close();
  };

  const handleNoteTo5AiFlashcards = async (note: NoteRecord) => {
    setNoteAiFcBusy(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const k = localStorage.getItem("kronoflow-gemini-key");
      if (k) headers["x-gemini-key"] = k;
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: `${note.title}

${note.content}`, count: 5 }),
      });
      if (res.ok) {
        const json = await res.json();
        const cards: { front: string; back: string }[] = json.data ?? [];
        await Promise.all(
          cards.slice(0, 5).map((c) =>
            fetch("/api/flashcards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ front: c.front, back: c.back, subjectId: note.subjectId ?? null }),
            })
          )
        );
        playUiTick("check");
        onRefresh();
        window.alert(`Đã tạo tự động ${Math.min(5, cards.length)} thẻ Flashcards AI từ ghi chú này!`);
      }
    } finally {
      setNoteAiFcBusy(false);
    }
  };

  const exportGlossaryCsv = () => {
    const rows = glossary
      .map((g) => `"${g.term.replaceAll('"', '""')}","${g.def.replaceAll('"', '""')}","${g.ex.replaceAll('"', '""')}"`)
      .join("\n");
    const blob = new Blob(["\uFEFFTerm,Definition,Example\n" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-glossary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [readProgress, setReadProgress] = useState(0);
  const [drillMode, setDrillMode] = useState(false);
  const [drillIdx, setDrillIdx] = useState(0);
  const [drillShowSol, setDrillShowSol] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showFindBar, setShowFindBar] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [quizOrderSeed, setQuizOrderSeed] = useState(0);

  const toggleVoiceNote = () => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      window.alert("Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói (hãy dùng Chrome/Edge).");
      return;
    }
    const rec = new Rec();
    rec.lang = "vi-VN";
    rec.interimResults = false;
    setVoiceListening(true);
    rec.onresult = (ev) => {
      const spoken = ev.results[0]?.[0]?.transcript ?? "";
      if (spoken) setNoteContent((prev) => (prev ? `${prev} ${spoken}` : spoken));
    };
    rec.onend = () => setVoiceListening(false);
    rec.start();
  };
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideData, setGuideData] = useState<{ keyPoints: string[]; questions: string[] } | null>(null);

  useEffect(() => {
    try {
      const dm = localStorage.getItem("kronoflow-draft-mistake");
      if (dm) {
        const parsed = JSON.parse(dm);
        if (parsed.q && !mQuestion) setMQuestion(parsed.q);
        if (parsed.r && !mReason) setMReason(parsed.r);
        if (parsed.s && !mSolution) setMSolution(parsed.s);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mQuestion || mReason || mSolution) {
      localStorage.setItem(
        "kronoflow-draft-mistake",
        JSON.stringify({ q: mQuestion, r: mReason, s: mSolution })
      );
    }
  }, [mQuestion, mReason, mSolution]);

  const handleGenerateStudyGuide = async (note: NoteRecord) => {
    setGuideLoading(true);
    setGuideData(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const k = localStorage.getItem("kronoflow-gemini-key");
      if (k) headers["x-gemini-key"] = k;
      const res = await fetch("/api/ai/study-guide", {
        method: "POST",
        headers,
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
      if (res.ok) {
        const json = await res.json();
        setGuideData(json.data ?? null);
      }
    } finally {
      setGuideLoading(false);
    }
  };

  const handleNoteToFlashcard = async (note: NoteRecord) => {
    await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: `Tóm tắt trọng tâm: ${note.title}`,
        back: note.content.slice(0, 350),
        subjectId: note.subjectId ?? null,
      }),
    });
    playUiTick("check");
    onRefresh();
    window.alert("Đã chuyển ghi chú thành 1 thẻ Flashcard mới!");
  };

  const allNoteTags = Array.from(
    new Set(
      notes.flatMap((n) => (n.content.match(/#[a-zA-Z0-9_À-ỹ-]+/g) ?? []).slice(0, 6))
    )
  ).slice(0, 10);

  const exportStudyBookMd = () => {
    const toc = filteredNotes.map((n, i) => `${i + 1}. ${n.title}`).join("\n");
    const body = filteredNotes
      .map((n, i) => `\n---\n\n# ${i + 1}. ${n.title}\n\n${n.content}`)
      .join("\n");
    const full = `# Sổ tay ôn tập KronoFlow (${filteredNotes.length} ghi chú)\n\n## Mục lục\n${toc}${body}`;
    const blob = new Blob([full], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-study-book-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [noteTitle, setNoteTitle] = useState("");
  const [cardSubject, setCardSubject] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [splitPreview, setSplitPreview] = useState(false);
  const [speechLang, setSpeechLang] = useState<"vi-VN" | "en-US">("vi-VN");
  const [autoSpeak, setAutoSpeak] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("kronoflow-draft-note");
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.title && !noteTitle) setNoteTitle(d.title);
        if (d.content && !noteContent) setNoteContent(d.content);
      }
      const savedCols = localStorage.getItem("kronoflow-note-colors");
      if (savedCols) setNoteColors(JSON.parse(savedCols));
      const nv = localStorage.getItem("kronoflow-notes-view");
      if (nv === "pastel") setPastelMode(true);
      else if (nv === "timeline") setNotesTimeline(true);
      else if (nv === "compact") setCompactNotes(true);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (noteTitle || noteContent) {
      localStorage.setItem("kronoflow-draft-note", JSON.stringify({ title: noteTitle, content: noteContent }));
    }
  }, [noteTitle, noteContent]);

  const cycleNotePastel = (id: string) => {
    const palette = ["", "#fef9c3", "#dcfce7", "#fce7f3", "#ede9fe"];
    const cur = noteColors[id] ?? "";
    const next = palette[(palette.indexOf(cur) + 1) % palette.length] ?? "";
    const updated = { ...noteColors, [id]: next };
    setNoteColors(updated);
    localStorage.setItem("kronoflow-note-colors", JSON.stringify(updated));
  };

  const printFlashcardsA4 = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const cardsHtml = flashcards
      .map(
        (c, i) =>
          `<div style="border:1px dashed #94a3b8;padding:14px;border-radius:10px;break-inside:avoid;">
            <div style="font-size:11px;color:#64748b;margin-bottom:6px;">Thẻ #${i + 1} · Mặt trước</div>
            <div style="font-weight:600;font-size:14px;margin-bottom:10px;">${c.front.replaceAll("<", "&lt;")}</div>
            <div style="border-top:1px solid #e2e8f0;padding-top:8px;font-size:13px;color:#334155;">${c.back.replaceAll("<", "&lt;")}</div>
          </div>`
      )
      .join("");
    win.document.write(
      `<html><head><title>KronoFlow Flashcards A4</title><style>body{font-family:system-ui,sans-serif;padding:24px;} .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}</style></head><body><h2 style="margin-bottom:16px;">Bộ thẻ Flashcards A4 (${flashcards.length} thẻ)</h2><div class="grid">${cardsHtml}</div><script>window.print();</script></body></html>`
    );
    win.document.close();
  };

  const handleBulkImportCards = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const pairs = lines
      .map((l) => {
        const parts = l.includes("\t") ? l.split("\t") : l.includes(";") ? l.split(";") : l.split(",");
        return { front: (parts[0] ?? "").trim(), back: parts.slice(1).join(" ").trim() };
      })
      .filter((p) => p.front && p.back)
      .filter((p) => !flashcards.some((ex) => ex.front.trim().toLowerCase() === p.front.toLowerCase()));
    if (pairs.length === 0) return;
    setBulkImporting(true);
    try {
      await Promise.all(
        pairs.slice(0, 40).map((p) =>
          fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ front: p.front, back: p.back, subjectId: cardSubject || null }),
          })
        )
      );
      setBulkText("");
      setBulkOpen(false);
      onRefresh();
    } finally {
      setBulkImporting(false);
    }
  };

  const runFeynmanCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feynmanConcept.trim() || feynmanBody.trim().length < 10) return;
    setFeynmanLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const k = localStorage.getItem("kronoflow-gemini-key");
      if (k) headers["x-gemini-key"] = k;
      const res = await fetch("/api/ai/feynman", {
        method: "POST",
        headers,
        body: JSON.stringify({ concept: feynmanConcept.trim(), explanation: feynmanBody.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setFeynmanRes(json.data ?? null);
      }
    } finally {
      setFeynmanLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang;
    u.rate = 0.96;
    window.speechSynthesis.speak(u);
  };

  const insertMdSnippet = (snippet: string) => {
    setNoteContent((prev) => (prev ? `${prev}${snippet}` : snippet.trimStart()));
  };
  const [noteSubject, setNoteSubject] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        subjectId: noteSubject || null,
      }),
    });
    if (res.ok) {
      setNoteTitle("");
      setNoteContent("");
      localStorage.removeItem("kronoflow-draft-note");
      onRefresh();
    }
  };

  const togglePin = async (n: NoteRecord) => {
    await fetch(`/api/notes/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !n.pinned }),
    });
    onRefresh();
  };

  const saveNoteEdit = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
    });
    setEditingNoteId(null);
    onRefresh();
  };

  const exportNoteMd = (n: NoteRecord) => {
    const blob = new Blob([`# ${n.title}\n\n${n.content}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${n.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mQuestion.trim() || !mReason.trim() || !mSolution.trim()) return;
    const res = await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: mQuestion.trim(),
        reason: mReason.trim(),
        solution: mSolution.trim(),
        subjectId: mSubject || null,
      }),
    });
    if (res.ok) {
      setMQuestion("");
      setMReason("");
      setMSolution("");
      localStorage.removeItem("kronoflow-draft-mistake");
      onRefresh();
    }
  };

  const toggleMistake = async (m: MistakeRecord) => {
    await fetch(`/api/mistakes/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !m.resolved }),
    });
    onRefresh();
  };

  const deleteMistake = async (id: string) => {
    await fetch(`/api/mistakes/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const deleteNote = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    onRefresh();
    if (target && onUndoableDelete) {
      onUndoableDelete(`Đã xóa ghi chú "${target.title}"`, async () => {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: target.title,
            content: target.content,
            subjectId: target.subjectId ?? undefined,
          }),
        });
        onRefresh();
      });
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: cardFront.trim(),
        back: cardBack.trim(),
        subjectId: cardSubject || null,
      }),
    });
    if (res.ok) {
      setCardFront("");
      setCardBack("");
      onRefresh();
    }
  };

  const nowMs = Date.now();
  const dueCards = flashcards.filter(
    (c) => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= nowMs
  );
  const subjectFilteredCards =
    deckSubject === "all" ? flashcards : flashcards.filter((c) => c.subjectId === deckSubject);
  const baseDeck = onlyDue
    ? subjectFilteredCards.filter((c) => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= nowMs)
    : subjectFilteredCards;
  const deck = weakOnly ? baseDeck.filter((c) => c.mastery <= 2) : baseDeck;

  useEffect(() => {
    if (subTab !== "flashcards" || deck.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
        playUiTick("flip");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFlipped(false);
        setCardIdx((i) => (i + 1) % deck.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFlipped(false);
        setCardIdx((i) => (i - 1 + deck.length) % deck.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [subTab, deck.length]);

  const updateMastery = async (card: FlashcardRecord, delta: number) => {
    const next = Math.max(0, Math.min(5, card.mastery + delta));
    await fetch(`/api/flashcards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery: next }),
    });
    setFlipped(false);
    if (deck.length > 1) setCardIdx((i) => (i + 1) % deck.length);
    onRefresh();
  };

  const deleteCard = async (id: string) => {
    const target = flashcards.find((c) => c.id === id);
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
    setFlipped(false);
    onRefresh();
    if (target && onUndoableDelete) {
      onUndoableDelete("Đã xóa 1 thẻ Flashcard", async () => {
        await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: target.front,
            back: target.back,
            subjectId: target.subjectId ?? undefined,
          }),
        });
        onRefresh();
      });
    }
  };

  const filteredNotes = notes.filter((n) => {
    const qNorm = normalizeVi(search);
    const matchSearch =
      normalizeVi(n.title).includes(qNorm) ||
      normalizeVi(n.content).includes(qNorm);
    if (!matchSearch) return false;
    if (activeTag && !n.content.includes(activeTag)) return false;
    return true;
  });

  const activeCard = deck[cardIdx % Math.max(1, deck.length)];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
          <button
            type="button"
            onClick={() => setSubTab("notes")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "notes"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Ghi chú ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("flashcards")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "flashcards"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Flashcards 3D ({flashcards.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab("quiz");
              setQuizIdx(0);
              setQuizScore(0);
              setQuizPicked(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "quiz"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Trắc nghiệm Quiz
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab("typing");
              setTypeInput("");
              setTypeResult("idle");
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
              subTab === "typing"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Tự gõ đáp án
          </button>
          <button
            type="button"
            onClick={() => setSubTab("mistakes")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "mistakes"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Sổ Lỗi Sai ({mistakes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("feynman")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "feynman"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Feynman AI
          </button>
          <button
            type="button"
            onClick={startMatchGame}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "match"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            Ghép cặp 60s
          </button>
          <button
            type="button"
            onClick={startTfDrill}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "tf"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Đúng/Sai 30s
          </button>
          <button
            type="button"
            onClick={() => setSubTab("glossary")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold",
              subTab === "glossary"
                ? "btn-primary"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <BookA className="h-3.5 w-3.5" />
            Thuật ngữ ({glossary.length})
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPdfOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <BookOpen className="h-3.5 w-3.5" /> Đọc PDF song song
          </button>
          {subTab === "notes" && (
            <button
              type="button"
              onClick={() => setPastelMode((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
                pastelMode
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              )}
            >
              <StickyNote className="h-3.5 w-3.5" /> {pastelMode ? "Bảng ghim Pastel" : "Lưới chuẩn"}
            </button>
          )}
          {subTab === "notes" && (
            <button
              type="button"
              onClick={() => setNotesTimeline((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
                notesTimeline
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              )}
            >
              <Clock className="h-3.5 w-3.5" /> {notesTimeline ? "Đang xem: Dòng thời gian" : "Dòng thời gian"}
            </button>
          )}
          {subTab === "notes" && (
            <button
              type="button"
              onClick={() => setCompactNotes((v) => !v)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-medium",
                compactNotes
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              )}
            >
              {compactNotes ? "Đang xem: Siêu gọn" : "Danh sách gọn"}
            </button>
          )}
          {subTab === "mistakes" && mistakes.length > 0 && (
            <button
              type="button"
              onClick={printMistakesA4}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Printer className="h-3.5 w-3.5" /> In Sổ Lỗi Sai A4
            </button>
          )}
          {subTab === "mistakes" && mistakes.some((m) => !m.resolved) && (
            <button
              type="button"
              onClick={async () => {
                const open = mistakes.filter((m) => !m.resolved);
                if (!window.confirm(`Đánh dấu đã hiểu vững toàn bộ ${open.length} lỗi sai hiện tại?`)) return;
                await Promise.all(
                  open.map((m) =>
                    fetch(`/api/mistakes/${m.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ resolved: true }),
                    })
                  )
                );
                playUiTick("check");
                onRefresh();
              }}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              ✓ Đánh dấu vững hết
            </button>
          )}
          {subTab === "notes" && filteredNotes.length > 0 && (
            <button
              type="button"
              onClick={exportStudyBookMd}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Sổ tay (.md)
            </button>
          )}
          {subTab === "flashcards" && subjects.length > 0 && (
            <select
              value={deckSubject}
              onChange={(e) => {
                setDeckSubject(e.target.value);
                setCardIdx(0);
                setFlipped(false);
              }}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
            >
              <option value="all">Tất cả môn ({flashcards.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {subTab === "flashcards" && (
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
            >
              <Upload className="h-3.5 w-3.5" /> Nhập hàng loạt CSV/Quizlet
            </button>
          )}
          {subTab === "flashcards" && flashcards.length > 0 && (
            <button
              type="button"
              onClick={printFlashcardsA4}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Printer className="h-3.5 w-3.5" /> In thẻ A4
            </button>
          )}
          {subTab === "flashcards" && flashcards.length > 0 && (
            <button
              type="button"
              onClick={exportFlashcardsCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Download className="h-3.5 w-3.5" /> Xuất CSV (Anki)
            </button>
          )}
          {subTab === "flashcards" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setWeakOnly((v) => !v);
                  setCardIdx(0);
                  setFlipped(false);
                }}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-medium",
                  weakOnly
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-600"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                )}
              >
                {weakOnly ? "Đang lọc: Thẻ yếu (≤2★)" : "Chỉ ôn thẻ yếu"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReverseCard((v) => !v);
                  setFlipped(false);
                }}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-medium",
                  reverseCard
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                )}
              >
                {reverseCard ? "Đang đảo chiều (Sau → Trước)" : "Đảo mặt thẻ"}
              </button>
            </>
          )}
        </div>
        <PdfStudyReaderModal
          open={pdfOpen}
          subjects={subjects}
          onClose={() => setPdfOpen(false)}
          onSaved={onRefresh}
        />

        {subTab === "notes" ? (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm ghi chú..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOnlyDue((v) => !v);
              setCardIdx(0);
              setFlipped(false);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium",
              onlyDue
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Cần ôn hôm nay ({dueCards.length} thẻ)
          </button>
        )}
      </div>

      {subTab === "notes" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateNote}
            className="glass-card space-y-3 rounded-2xl p-5 lg:col-span-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tạo ghi chú mới</h3>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Tiêu đề..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={noteSubject}
              onChange={(e) => { setNoteSubject(e.target.value); if (e.target.value) localStorage.setItem("kronoflow-last-subject", e.target.value); }}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">-- Gắn môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[var(--text-muted)]">Mẫu nhanh:</span>
              {(
                [
                  ["Cornell", "## Từ khóa chính\n- ...\n\n## Nội dung chi tiết\n- ...\n\n## Tóm tắt cuối bài\n- ..."],
                  ["Tóm tắt chương", "## Ý tưởng cốt lõi\n- ...\n\n## Công thức / Khái niệm\n- ...\n\n## Câu hỏi ôn tập\n- [ ] ..."],
                  ["Case Study", "## Bối cảnh vấn đề\n...\n\n## Phân tích nguyên nhân\n- ...\n\n## Giải pháp & Kết luận\n- ..."],
                  ["Họp nhóm", "## Mục tiêu buổi họp\n- ...\n\n## Phân công công việc\n- [ ] Thành viên A: ...\n- [ ] Thành viên B: ..."],
                ] as const
              ).map(([label, tpl]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setNoteContent(tpl);
                    if (!noteTitle) setNoteTitle(label);
                    playUiTick("flip");
                  }}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  + {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1.5 text-[11px]">
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => insertMdSnippet(" **in đậm** ")} className="rounded px-1.5 py-0.5 font-bold hover:bg-[var(--bg-elevated)]">B</button>
                <button type="button" onClick={() => insertMdSnippet(" *nghiêng* ")} className="rounded px-1.5 py-0.5 italic hover:bg-[var(--bg-elevated)]">I</button>
                <button type="button" onClick={() => insertMdSnippet(" `code` ")} className="rounded px-1.5 py-0.5 font-mono hover:bg-[var(--bg-elevated)]">&lt;/&gt;</button>
                <button type="button" onClick={() => insertMdSnippet("\n## Tiêu đề mục\n")} className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-elevated)]">H2</button>
                <button type="button" onClick={() => insertMdSnippet("\n- [ ] Việc cần làm")} className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-elevated)]">☑ List</button>
              </div>
              <button
                type="button"
                onClick={() => setSplitPreview((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium",
                  splitPreview ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                )}
              >
                <Columns2 className="h-3 w-3" />
                {splitPreview ? "Đang chia đôi" : "Chia đôi xem trước"}
              </button>
              <button
                type="button"
                onClick={() => setShowFindBar((v) => !v)}
                className="rounded-lg px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Tìm & Thay
              </button>
              <button
                type="button"
                onClick={toggleVoiceNote}
                title="Đọc giọng nói tiếng Việt chuyển thành ghi chú"
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium",
                  voiceListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                )}
              >
                {voiceListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {voiceListening ? "Đang nghe..." : "Giọng nói"}
              </button>
            </div>
            {showFindBar && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-xs">
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Tìm từ..."
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Thay bằng..."
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!findText) return;
                    setNoteContent((prev) => prev.replaceAll(findText, replaceText));
                  }}
                  className="btn-primary rounded-lg px-2.5 py-1 text-[11px] font-medium"
                >
                  Thay hết
                </button>
              </div>
            )}
            <div className={cn("grid gap-2.5", splitPreview ? "sm:grid-cols-2" : "grid-cols-1")}>
              <textarea
                rows={7}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Hỗ trợ Markdown: # Tiêu đề, **in đậm**, `code`, - [ ] checklist..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              {splitPreview && (
                <div className="max-h-[196px] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs">
                  {noteContent.trim() ? (
                    <MarkdownView content={noteContent} />
                  ) : (
                    <span className="text-[var(--text-muted)]">Xem trước Markdown trực tiếp...</span>
                  )}
                </div>
              )}
            </div>
            {(() => {
              const words = noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0;
              const pct = wordTarget > 0 ? Math.min(100, Math.round((words / wordTarget) * 100)) : 0;
              return (
                <div className="space-y-1.5 text-[11px] text-[var(--text-muted)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {words} từ · ~{Math.max(1, Math.ceil(words / 180))} phút đọc
                      {wordTarget > 0 && (
                        <strong className="ml-1.5 font-mono text-[var(--accent)]">({pct}% mục tiêu)</strong>
                      )}
                    </span>
                    <label className="inline-flex items-center gap-1">
                      Mục tiêu từ:
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={wordTarget}
                        onChange={(e) => setWordTarget(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]"
                      />
                    </label>
                  </div>
                  {wordTarget > 0 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })()}
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Lưu ghi chú
            </button>
          </form>

          {notes.some((n) => n.pinned) && (
            <div className="glass-card rounded-2xl p-4 lg:col-span-12">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Pin className="h-3.5 w-3.5" /> Ghi chú đã ghim (Mở nhanh)
              </div>
              <div className="flex flex-wrap gap-2">
                {notes
                  .filter((n) => n.pinned)
                  .map((pn) => (
                    <button
                      key={`pin-shelf-${pn.id}`}
                      type="button"
                      onClick={() => setReadingNote(pn)}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-amber-500"
                    >
                      {pn.title}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {allNoteTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] lg:col-span-12">
              <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5",
                  !activeTag
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                )}
              >
                Tất cả thẻ
              </button>
              {allNoteTags.map((tg) => (
                <button
                  key={tg}
                  type="button"
                  onClick={() => setActiveTag((cur) => (cur === tg ? null : tg))}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5",
                    activeTag === tg
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                      : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                  )}
                >
                  {tg}
                </button>
              ))}
            </div>
          )}
          <div className={cn("lg:col-span-7", compactNotes ? "space-y-2" : notesTimeline ? "space-y-3 border-l-2 border-[var(--accent)]/40 pl-4" : pastelMode ? "columns-1 gap-4 space-y-4 sm:columns-2" : "grid gap-4 sm:grid-cols-2")}>
            {filteredNotes.map((n) => {
              const sub = n.subjectId ? subjectMap.get(n.subjectId) : undefined;
              const pCol = pastelMode ? noteColors[n.id] : "";
              return (
                <article
                  key={n.id}
                  style={pCol ? { backgroundColor: pCol, color: "#1e293b" } : undefined}
                  className="glass-card card-lift break-inside-avoid flex flex-col justify-between rounded-2xl p-4"
                >
                  {pastelMode && (
                    <button
                      type="button"
                      onClick={() => cycleNotePastel(n.id)}
                      className="mb-1.5 self-end rounded-md border border-black/10 bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                    >
                      Đổi màu giấy
                    </button>
                  )}
                  {editingNoteId === n.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                      />
                      <textarea
                        rows={4}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveNoteEdit(n.id)}
                          className="btn-primary rounded-lg px-3 py-1 text-[11px] font-medium"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg border border-[var(--border-subtle)] px-3 py-1 text-[11px] text-[var(--text-muted)]"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-[var(--text-primary)]">{n.title}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setReadingNote(n)}
                            title="Đọc khổ rộng"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                          {onFocusNote && (
                            <button
                              type="button"
                              onClick={() => onFocusNote(`Ôn ghi chú: ${n.title}`)}
                              title="Học ghi chú này trong Phòng Tập Trung"
                              className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => exportNoteMd(n)}
                            title="Tải xuống .md"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(n.id);
                              setEditTitle(n.title);
                              setEditContent(n.content);
                            }}
                            title="Sửa ghi chú"
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePin(n)}
                            className={cn(
                              "rounded-lg p-1",
                              n.pinned ? "bg-amber-500/15 text-amber-500" : "text-[var(--text-muted)]"
                            )}
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNote(n.id)}
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <MarkdownView content={n.content} />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--text-muted)]">
                    <span>{sub ? sub.name : "Chung"}</span>
                    <span>{new Date(n.updatedAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : subTab === "mistakes" ? (
        <div className="space-y-4">
          {mistakes.filter((m) => !m.resolved).length > 0 && (
            <div className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-2xl px-5 py-3 text-xs">
              <span className="font-medium text-[var(--text-primary)]">
                Còn <strong>{mistakes.filter((m) => !m.resolved).length}</strong> lỗi sai chưa nắm vững — ôn lại bằng chế độ thẻ lật nhanh?
              </span>
              <button
                type="button"
                onClick={() => {
                  setDrillMode((v) => !v);
                  setDrillIdx(0);
                  setDrillShowSol(false);
                }}
                className="btn-primary rounded-xl px-3.5 py-1.5 text-xs font-medium"
              >
                {drillMode ? "Quay về danh sách" : "Luyện đề lỗi sai (Drill)"}
              </button>
            </div>
          )}
          {drillMode && (() => {
            const unresolved = mistakes.filter((m) => !m.resolved);
            const cur = unresolved[drillIdx % Math.max(1, unresolved.length)];
            if (!cur) return null;
            return (
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Câu lỗi sai #{(drillIdx % unresolved.length) + 1} / {unresolved.length}</span>
                  <span>Che lời giải → Tự nhớ lại</span>
                </div>
                <div className="text-base font-semibold text-[var(--text-primary)]">{cur.question}</div>
                <div className="text-xs text-rose-500">Nguyên nhân từng sai: {cur.reason}</div>
                {drillShowSol ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-[var(--text-primary)]">
                    <strong>Cách giải chuẩn:</strong> {cur.solution}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDrillShowSol(true)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-2 text-xs font-medium text-[var(--accent)]"
                  >
                    Hiện lời giải & kiểm tra
                  </button>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await toggleMistake(cur);
                      playUiTick("check");
                      setDrillShowSol(false);
                    }}
                    className="btn-primary rounded-xl px-4 py-2 text-xs font-medium"
                  >
                    Đã hiểu vững (Đánh dấu xong)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrillIdx((i) => i + 1);
                      setDrillShowSol(false);
                    }}
                    className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-secondary)]"
                  >
                    Câu tiếp theo →
                  </button>
                </div>
              </div>
            );
          })()}
        <div className="grid gap-6 lg:grid-cols-12">
          <form onSubmit={handleAddMistake} className="glass-card space-y-3 p-5 lg:col-span-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Ghi nhận Lỗi sai & Rút kinh nghiệm
            </h3>
            <select
              value={mSubject}
              onChange={(e) => setMSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">-- Môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              rows={2}
              value={mQuestion}
              onChange={(e) => setMQuestion(e.target.value)}
              placeholder="Câu hỏi / Bài tập làm sai..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={2}
              value={mReason}
              onChange={(e) => setMReason(e.target.value)}
              placeholder="Nguyên nhân sai (VD: Quên điều kiện biên, nhầm dấu)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={2}
              value={mSolution}
              onChange={(e) => setMSolution(e.target.value)}
              placeholder="Cách giải đúng & Lưu ý cần nhớ..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button type="submit" className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" />
              Lưu vào Sổ Lỗi Sai
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            {mistakes.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-[var(--text-muted)]">
                Chưa có ghi nhận lỗi sai nào. Lưu lại những lỗi hay gặp để tránh lặp lại khi đi thi!
              </div>
            ) : (
              mistakes.map((m) => {
                const sub = m.subjectId ? subjectMap.get(m.subjectId) : undefined;
                return (
                  <div key={m.id} className="glass-card card-lift space-y-2 p-4 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {sub && (
                          <span className="mr-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                            {sub.name}
                          </span>
                        )}
                        {m.question}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleMistake(m)}
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] font-medium",
                            m.resolved
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {m.resolved ? "✓ Đã khắc phục" : "Cần ôn lại"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMistake(m.id)}
                          className="text-[var(--text-muted)] hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-rose-600 dark:text-rose-400">
                      <strong>Lỗi:</strong> {m.reason}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400">
                      <strong>Cách sửa:</strong> {m.solution}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>
      ) : subTab === "typing" ? (
        <div className="glass-card mx-auto max-w-xl p-6">
          {flashcards.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              Chưa có thẻ Flashcard nào để luyện gõ.
            </p>
          ) : (() => {
            const tCard = flashcards[quizIdx % flashcards.length]!;
            return (
              <div>
                <div className="text-xs text-[var(--text-muted)]">
                  Thẻ {(quizIdx % flashcards.length) + 1} / {flashcards.length} · Luyện nhớ chủ động (Typing Recall)
                </div>
                <h4 className="mt-3 text-lg font-medium text-[var(--text-primary)]">
                  {tCard.front}
                </h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const ok =
                      typeInput.trim().toLowerCase() === tCard.back.trim().toLowerCase();
                    setTypeResult(ok ? "right" : "wrong");
                  }}
                  className="mt-4 space-y-3"
                >
                  <input
                    type="text"
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    placeholder="Nhập chính xác đáp án..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-xs font-medium">
                      Kiểm tra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuizIdx((i) => i + 1);
                        setTypeInput("");
                        setTypeResult("idle");
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs text-[var(--text-secondary)]"
                    >
                      Thẻ tiếp theo →
                    </button>
                  </div>
                </form>
                {typeResult !== "idle" && (
                  <div
                    className={cn(
                      "mt-4 rounded-xl p-3 text-xs font-medium",
                      typeResult === "right"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {typeResult === "right"
                      ? "Chính xác tuyệt đối!"
                      : `Chưa khớp — Đáp án đúng là: "${tCard.back}"`}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : subTab === "quiz" ? (
        <div className="glass-card mx-auto max-w-2xl rounded-2xl p-6">
          {flashcards.length < 2 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              Cần tạo ít nhất 2 thẻ Flashcard để hệ thống tự sinh đề trắc nghiệm.
            </p>
          ) : (() => {
            const qCard = flashcards[quizIdx % flashcards.length]!;
            const distractors = flashcards
              .filter((c) => c.id !== qCard.id)
              .slice(0, 3)
              .map((c) => c.back);
            const options = [qCard.back, ...distractors].sort((a, b) => a.localeCompare(b));
            return (
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Câu {(quizIdx % flashcards.length) + 1} / {flashcards.length}</span>
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    Điểm: {quizScore}
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  {qCard.front}
                </h4>
                <div className="mt-5 grid gap-2.5">
                  {options.map((opt, idx) => {
                    const isCorrect = opt === qCard.back;
                    const picked = quizPicked === opt;
                    return (
                      <button
                        key={opt + idx}
                        type="button"
                        disabled={quizPicked !== null}
                        onClick={() => {
                          setQuizPicked(opt);
                          if (isCorrect) setQuizScore((s) => s + 1);
                        }}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left text-xs font-medium",
                          quizPicked === null
                            ? "border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--accent)]"
                            : isCorrect
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : picked
                            ? "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] opacity-60"
                        )}
                      >
                        <span className="mr-2 font-mono font-bold">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizPicked !== null && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setQuizOrderSeed((s) => s + 1);
                        setQuizIdx(0);
                        setQuizPicked(null);
                      }}
                      className="mr-2 inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]"
                    >
                      <Shuffle className="h-3.5 w-3.5" /> Đảo đề
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuizPicked(null);
                        setQuizIdx((i) => i + 1);
                      }}
                      className="btn-primary rounded-xl px-4 py-2 text-xs font-medium"
                    >
                      Câu tiếp theo →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : subTab === "glossary" ? (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <BookA className="h-4 w-4 text-[var(--accent)]" />
              Sổ tay Thuật ngữ & Từ vựng chuyên ngành (A–Z)
              {glossary.length > 0 && (
                <button
                  type="button"
                  onClick={exportGlossaryCsv}
                  className="ml-2 inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                >
                  <Download className="h-3 w-3" /> Xuất CSV
                </button>
              )}
              {glossary.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const fresh = glossary.filter(
                      (g) => !flashcards.some((f) => f.front.trim().toLowerCase() === g.term.toLowerCase())
                    );
                    if (fresh.length === 0) {
                      window.alert("Tất cả thuật ngữ đã có trong bộ Flashcards!");
                      return;
                    }
                    await Promise.all(
                      fresh.slice(0, 25).map((g) =>
                        fetch("/api/flashcards", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            front: g.term,
                            back: g.ex ? `${g.def} (VD: ${g.ex})` : g.def,
                            subjectId: cardSubject || null,
                          }),
                        })
                      )
                    );
                    playUiTick("check");
                    onRefresh();
                    window.alert(`Đã tạo ${Math.min(25, fresh.length)} thẻ Flashcard từ Sổ tay Thuật ngữ!`);
                  }}
                  className="ml-1 inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
                >
                  → Sang Flashcards
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 text-[10px]">
              {["ALL", ...Array.from(new Set(glossary.map((g) => g.term.charAt(0).toUpperCase()))).sort()].map((lt) => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => setGLetter(lt)}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-mono font-semibold",
                    gLetter === lt ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                  )}
                >
                  {lt === "ALL" ? "Tất cả" : lt}
                </button>
              ))}
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!gTerm.trim() || !gDef.trim()) return;
              saveGlossary(
                [{ id: String(Date.now()), term: gTerm.trim(), def: gDef.trim(), ex: gEx.trim() }, ...glossary].sort((a, b) =>
                  a.term.localeCompare(b.term, "vi")
                )
              );
              setGTerm("");
              setGDef("");
              setGEx("");
            }}
            className="grid gap-2 sm:grid-cols-12"
          >
            <input
              type="text"
              value={gTerm}
              onChange={(e) => setGTerm(e.target.value)}
              placeholder="Thuật ngữ / Từ khóa..."
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs sm:col-span-3"
            />
            <input
              type="text"
              value={gDef}
              onChange={(e) => setGDef(e.target.value)}
              placeholder="Định nghĩa ngắn gọn..."
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs sm:col-span-4"
            />
            <input
              type="text"
              value={gEx}
              onChange={(e) => setGEx(e.target.value)}
              placeholder="Ví dụ minh họa (tùy chọn)..."
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs sm:col-span-3"
            />
            <button type="submit" className="btn-primary rounded-xl px-3 py-2 text-xs font-medium sm:col-span-2">
              + Thêm từ
            </button>
          </form>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {glossary
              .filter((g) => gLetter === "ALL" || g.term.charAt(0).toUpperCase() === gLetter)
              .map((g) => (
                <div
                  key={g.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--accent)]">{g.term}</div>
                    <div className="mt-0.5 text-[var(--text-primary)]">{g.def}</div>
                    {g.ex && <div className="mt-1 italic text-[11px] text-[var(--text-muted)]">VD: {g.ex}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => saveGlossary(glossary.filter((x) => x.id !== g.id))}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
            ) : subTab === "tf" ? (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Zap className="h-4 w-4 text-amber-500" />
              Phản xạ Đúng / Sai 30 giây
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono font-semibold text-[var(--accent)]">Còn {tfSec}s</span>
              <span className="font-mono font-semibold text-emerald-600">Điểm: {tfScore}</span>
              <button
                type="button"
                onClick={startTfDrill}
                className="btn-primary rounded-lg px-3 py-1 text-[11px] font-medium"
              >
                Chơi lại
              </button>
            </div>
          </div>
          {!tfRound ? (
            <p className="text-xs text-[var(--text-muted)]">
              Cần ít nhất 2 thẻ Flashcard để chơi chế độ phản xạ Đúng / Sai.
            </p>
          ) : tfSec <= 0 ? (
            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-5 text-center">
              <div className="text-base font-semibold text-[var(--accent)]">
                Hết giờ! Bạn ghi được {tfScore} điểm
              </div>
              <button
                type="button"
                onClick={startTfDrill}
                className="btn-primary mt-3 rounded-xl px-4 py-2 text-xs font-medium"
              >
                Thử lại 30 giây mới
              </button>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 text-center">
              <div className="text-xs text-[var(--text-muted)]">Cặp câu hỏi & đáp án sau ĐÚNG hay SAI?</div>
              <div className="text-base font-semibold text-[var(--text-primary)]">{tfRound.front}</div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-secondary)]">
                {tfRound.shownBack}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (tfRound.isTrue) {
                      setTfScore((s) => s + 1);
                      playUiTick("check");
                    }
                    nextTfRound();
                  }}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  ✓ ĐÚNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!tfRound.isTrue) {
                      setTfScore((s) => s + 1);
                      playUiTick("check");
                    }
                    nextTfRound();
                  }}
                  className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  ✕ SAI
                </button>
              </div>
            </div>
          )}
        </div>
            ) : subTab === "match" ? (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Gamepad2 className="h-4 w-4 text-[var(--accent)]" />
              Mini-game Ghép cặp Flashcard (60 giây)
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono font-semibold text-[var(--accent)]">
                Còn {matchSec}s
              </span>
              <span className="text-[var(--text-secondary)]">
                Đã ghép: {matchedIds.length}/{Math.floor(matchTiles.length / 2)}
              </span>
              <button
                type="button"
                onClick={startMatchGame}
                className="btn-primary rounded-lg px-3 py-1 text-[11px] font-medium"
              >
                Chơi lại
              </button>
            </div>
          </div>
          {matchTiles.length < 4 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Hãy tạo ít nhất 2 thẻ Flashcard để bắt đầu trò chơi ghép cặp.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {matchTiles.map((tile) => {
                const isMatched = matchedIds.includes(tile.cardId);
                const isSelected = matchPicked === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={isMatched || matchSec <= 0}
                    onClick={() => pickMatchTile(tile)}
                    className={cn(
                      "min-h-[78px] rounded-xl border p-3 text-left text-xs transition-all",
                      isMatched
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 opacity-55"
                        : isSelected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold ring-2 ring-[var(--accent)]/40"
                        : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                    )}
                  >
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                      {tile.side === "front" ? "Câu hỏi" : "Đáp án"}
                    </div>
                    <div className="line-clamp-3">{tile.text}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : subTab === "feynman" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <form onSubmit={runFeynmanCheck} className="glass-card space-y-3 rounded-2xl p-6 lg:col-span-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              Ôn bài bằng Kỹ thuật Feynman cùng AI
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Hãy tự giải thích khái niệm bằng ngôn từ đơn giản như đang giảng lại cho người mới — AI sẽ chấm độ rõ ràng và chỉ ra lỗ hổng.
            </p>
            <input
              type="text"
              value={feynmanConcept}
              onChange={(e) => setFeynmanConcept(e.target.value)}
              placeholder="Tên khái niệm (VD: Quy luật giá trị, Đệ quy, Lạm phát...)"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={7}
              value={feynmanBody}
              onChange={(e) => setFeynmanBody(e.target.value)}
              placeholder="Viết lại lời giải thích theo cách hiểu của riêng bạn..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={feynmanLoading || !feynmanConcept.trim() || feynmanBody.trim().length < 10}
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {feynmanLoading ? "AI đang chấm độ rõ ràng..." : "Chấm điểm Feynman"}
            </button>
          </form>
          <div className="glass-card rounded-2xl p-6 lg:col-span-6">
            {feynmanRes ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">Điểm dễ hiểu Feynman</span>
                  <span className="font-mono text-2xl font-bold text-[var(--accent)]">
                    {feynmanRes.clarityScore}/100
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">Điểm làm tốt</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                    {feynmanRes.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-amber-600 dark:text-amber-400">Lỗ hổng cần bổ sung</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                    {feynmanRes.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
                {feynmanRes.analogy && (
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-[var(--text-secondary)]">
                    <strong>Ví dụ gợi nhớ:</strong> {feynmanRes.analogy}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-[var(--text-muted)]">
                Nhập khái niệm và lời giải thích bên trái để nhận phản hồi chi tiết từ AI.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bulkOpen && (
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Nhập nhanh nhiều Flashcards (mỗi dòng 1 thẻ, ngăn cách bởi dấu chấm phẩy <code>;</code> hoặc Tab từ Quizlet/Excel)
              </div>
              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Resilient ; Kiên cường, mau phục hồi\nOpportunity cost ; Chi phí cơ hội"}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 font-mono text-xs text-[var(--text-primary)]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={bulkImporting || !bulkText.trim()}
                  onClick={handleBulkImportCards}
                  className="btn-primary rounded-xl px-4 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {bulkImporting ? "Đang nhập..." : "Tạo hàng loạt thẻ"}
                </button>
              </div>
            </div>
          )}
          {flashcards.length > 0 && (() => {
            const fresh = flashcards.filter((c) => c.mastery <= 1).length;
            const learning = flashcards.filter((c) => c.mastery >= 2 && c.mastery <= 3).length;
            const mastered = flashcards.filter((c) => c.mastery >= 4).length;
            const tot = Math.max(1, flashcards.length);
            return (
              <div className="glass-card rounded-2xl p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span>Phân bố độ thuộc ({flashcards.length} thẻ):</span>
                  <div className="flex flex-wrap gap-3">
                    <span className="text-amber-600 dark:text-amber-400">Mới học: {fresh}</span>
                    <span className="text-sky-600 dark:text-sky-400">Đang nhớ: {learning}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Đã thuộc: {mastered}</span>
                  </div>
                </div>
                <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div className="bg-amber-400" style={{ width: `${(fresh / tot) * 100}%` }} />
                  <div className="bg-sky-500" style={{ width: `${(learning / tot) * 100}%` }} />
                  <div className="bg-emerald-500" style={{ width: `${(mastered / tot) * 100}%` }} />
                </div>
              </div>
            );
          })()}
          <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {activeCard ? (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    Thẻ {(cardIdx % deck.length) + 1} / {deck.length}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <span
                        key={lv}
                        className={cn(
                          "h-1.5 w-4 rounded-full transition-colors",
                          lv <= activeCard.mastery ? "bg-emerald-500" : "bg-[var(--bg-elevated)]"
                        )}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => deleteCard(activeCard.id)}
                      className="ml-2 text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => speakText(flipped ? activeCard.back : activeCard.front)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 font-medium text-[var(--accent)]"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Đọc {flipped ? "đáp án" : "câu hỏi"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechLang((l) => (l === "vi-VN" ? "en-US" : "vi-VN"))}
                      className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)]"
                    >
                      {speechLang === "vi-VN" ? "Giọng VI" : "Voice EN"}
                    </button>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                    />
                    Tự đọc khi lật
                  </label>
                </div>

                {/* 3D FLIP CARD */}
                <div
                  onClick={() => {
                    const nextFlipped = !flipped;
                    setFlipped(nextFlipped);
                    playUiTick("flip");
                    if (autoSpeak) {
                      speakText(nextFlipped ? activeCard.back : activeCard.front);
                    }
                  }}
                  className="perspective-1000 mt-3 h-[220px] w-full cursor-pointer"
                >
                  <div
                    className={cn(
                      "flip-inner relative h-full w-full",
                      flipped && "is-flipped"
                    )}
                  >
                    <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-6 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                        Câu hỏi / Khái niệm
                      </span>
                      <p className="mt-3 text-lg font-medium text-[var(--text-primary)]">
                        {reverseCard ? activeCard.back : activeCard.front}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <RotateCw className="h-3 w-3" />
                        Chạm để lật 3D
                      </span>
                    </div>

                    <div className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-6 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                        Đáp án / Giải thích
                      </span>
                      <p className="mt-3 text-base font-medium text-[var(--text-primary)]">
                        {reverseCard ? activeCard.front : activeCard.back}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setCardIdx((i) => (i - 1 + deck.length) % deck.length);
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setCardIdx((i) => (i + 1) % deck.length);
                      }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateMastery(activeCard, -1)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
                    >
                      Ôn lại hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMastery(activeCard, 1)}
                      className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Đã thuộc (SM-2)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card flex min-h-[260px] items-center justify-center rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                {onlyDue
                  ? "Bạn đã ôn xong toàn bộ thẻ đến hạn hôm nay!"
                  : "Chưa có thẻ Flashcard nào. Tạo thẻ mới ở cột bên phải nhé."}
              </div>
            )}
          </div>

          <form
            onSubmit={handleCreateCard}
            className="glass-card space-y-3 rounded-2xl p-5 lg:col-span-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Thêm thẻ Flashcard</h3>
            <select
              value={cardSubject}
              onChange={(e) => setCardSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs text-[var(--text-secondary)]"
            >
              <option value="">-- Môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              value={cardFront}
              onChange={(e) => setCardFront(e.target.value)}
              placeholder="Mặt trước (Câu hỏi / Thuật ngữ)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <textarea
              rows={3}
              value={cardBack}
              onChange={(e) => setCardBack(e.target.value)}
              placeholder="Mặt sau (Đáp án / Giải thích)..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo thẻ ôn tập
            </button>
          </form>
          </div>
        </div>
      )}
      {readingNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setReadingNote(null)}
        >
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              const max = Math.max(1, el.scrollHeight - el.clientHeight);
              setReadProgress(Math.min(100, Math.round((el.scrollTop / max) * 100)));
            }}
            style={bookPaperMode ? { backgroundColor: "#faf6ee", color: "#1c1917" } : undefined}
            className="animate-pop relative max-h-[88vh] w-full max-w-[680px] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky -top-6 -mx-6 mb-4 h-1 bg-[var(--bg-elevated)]">
              <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${readProgress}%` }} />
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-xl font-medium">
                {readingNote.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookPaperMode((v) => !v)}
                  className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs"
                >
                  {bookPaperMode ? "Nền chuẩn" : "Giấy sách"}
                </button>
                <button
                  type="button"
                  onClick={() => setClozeMode((v) => !v)}
                  title="Ẩn các từ khóa in đậm (**...**) thành chỗ trống để tự kiểm tra trí nhớ"
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium",
                    clozeMode
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)]"
                  )}
                >
                  {clozeMode ? "Hiện từ khóa" : "Điền khuyết"}
                </button>
                <button
                  type="button"
                  onClick={() => setReaderFont((f) => (f === "sans" ? "serif" : f === "serif" ? "mono" : "sans"))}
                  title="Đổi phông chữ chế độ đọc (Sans / Serif / Mono)"
                  className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 font-mono text-[11px]"
                >
                  {readerFont === "serif" ? "Serif" : readerFont === "mono" ? "Mono" : "Sans"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSlideMode((v) => !v);
                    setSlideIdx(0);
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px]",
                    slideMode ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)]"
                  )}
                >
                  {slideMode ? "Thoát Slide" : "Trình chiếu"}
                </button>
                <button
                  type="button"
                  onClick={() => setBlindRecall((v) => !v)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px]",
                    blindRecall ? "border-amber-500 bg-amber-500/15 text-amber-600" : "border-[var(--border-subtle)]"
                  )}
                >
                  {blindRecall ? "Tắt tự viết" : "Tự viết lại"}
                </button>
                <button
                  type="button"
                  disabled={guideLoading}
                  onClick={() => handleGenerateStudyGuide(readingNote)}
                  className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-50"
                >
                  {guideLoading ? "Đang tạo..." : "✦ Đề cương AI"}
                </button>
                <button
                  type="button"
                  onClick={() => handleNoteToFlashcard(readingNote)}
                  className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs"
                >
                  → Flashcard
                </button>
                <button
                  type="button"
                  disabled={noteAiFcBusy}
                  onClick={() => handleNoteTo5AiFlashcards(readingNote)}
                  className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-50"
                >
                  {noteAiFcBusy ? "Đang tạo..." : "✦ 5 Thẻ AI"}
                </button>
                <button
                  type="button"
                  onClick={() => exportNoteMd(readingNote)}
                  className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs"
                >
                  Tải .md
                </button>
                <button type="button" onClick={() => setReadingNote(null)}>
                  <X className="h-4 w-4 opacity-70" />
                </button>
              </div>
            </div>
            {blindRecall && (
              <div className="mt-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Chế độ Tự viết không nhìn (di chuột vào bài bên dưới để đối chiếu):
                </div>
                <textarea
                  rows={4}
                  value={blindText}
                  onChange={(e) => setBlindText(e.target.value)}
                  placeholder="Gõ lại những ý chính bạn nhớ được từ ghi chú này..."
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}
            {slideMode ? (() => {
              const slides = readingNote.content
                .split(/(?=^## )/m)
                .map((s) => s.trim())
                .filter(Boolean);
              const totalS = Math.max(1, slides.length);
              const curSlide = slides[slideIdx % totalS] ?? readingNote.content;
              return (
                <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Trang {(slideIdx % totalS) + 1} / {totalS}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSlideIdx((i) => (i - 1 + totalS) % totalS)}
                        className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs"
                      >
                        ← Trước
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlideIdx((i) => (i + 1) % totalS)}
                        className="btn-primary rounded-lg px-2.5 py-1 text-xs"
                      >
                        Tiếp →
                      </button>
                    </div>
                  </div>
                  <div className="min-h-[160px] py-2">
                    <MarkdownView content={curSlide} />
                  </div>
                </div>
              );
            })() : (
            <div
              className={cn(
                "mt-4 leading-relaxed transition-all",
                blindRecall && "blur-sm hover:blur-none",
                readerFont === "serif" ? "font-serif" : readerFont === "mono" ? "font-mono text-xs" : "font-sans"
              )}
            >
              <MarkdownView
                content={
                  clozeMode
                    ? readingNote.content.replace(/\*\*([^*]+)\*\*/g, "`[ ________ ]`")
                    : readingNote.content
                }
              />
            </div>
            )}
            {guideData && (
              <div className="mt-5 space-y-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/50 p-4 text-xs">
                <div className="font-semibold text-[var(--accent)]">✦ Đề cương ôn tập AI</div>
                <div>
                  <div className="font-medium">5 Ý cốt lõi:</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {guideData.keyPoints.map((kp, i) => (
                      <li key={i}>{kp}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium">Câu hỏi tự luận trọng tâm:</div>
                  <ol className="mt-1 list-decimal space-y-1 pl-4">
                    {guideData.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
            {(() => {
              const wikiRefs = Array.from(readingNote.content.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) =>
                (m[1] ?? "").trim().toLowerCase()
              );
              const linked = notes.filter(
                (other) =>
                  other.id !== readingNote.id &&
                  (wikiRefs.some((r) => other.title.toLowerCase().includes(r)) ||
                    other.content.toLowerCase().includes(`[[${readingNote.title.toLowerCase()}]]`))
              );
              if (linked.length === 0) return null;
              return (
                <div className="mt-6 border-t border-[var(--border-subtle)] pt-3 text-xs">
                  <div className="mb-2 font-semibold opacity-80">Liên kết ghi chú liên quan (Backlinks):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {linked.map((ln) => (
                      <button
                        key={ln.id}
                        type="button"
                        onClick={() => {
                          setReadingNote(ln);
                          setReadProgress(0);
                        }}
                        className="rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 py-1 font-medium text-[var(--accent)]"
                      >
                        ↗ {ln.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
