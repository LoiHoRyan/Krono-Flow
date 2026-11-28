"use client";

import { getLocalDateIso } from "@/lib/utils";

import { useEffect, useRef, useState } from "react";
import { Download, Eraser, Grid3X3, PenTool, Trash2, Undo2, X } from "lucide-react";

const COLORS = ["#0f172a", "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];

export function StudyWhiteboardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  const [color, setColor] = useState("#0f172a");
  const [lineWidth, setLineWidth] = useState(3);
  const [eraser, setEraser] = useState(false);
  const [gridBg, setGridBg] = useState(true);
  const [historyLen, setHistoryLen] = useState(0);

  const fillWhite = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  };

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    fillWhite(ctx, canvas.width, canvas.height);
    historyRef.current = [];
    setHistoryLen(0);
  }, [open]);

  if (!open) return null;

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = [...historyRef.current.slice(-19), snap];
      setHistoryLen(historyRef.current.length);
    } catch {
      // ignore
    }
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? lineWidth * 4 : lineWidth;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLen(historyRef.current.length);
    if (last) ctx.putImageData(last, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    fillWhite(ctx, canvas.width, canvas.height);
    historyRef.current = [];
    setHistoryLen(0);
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronoflow-whiteboard-${getLocalDateIso()}.png`;
    a.click();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Bảng Nháp Vẽ tay (Sơ đồ cây, Lưu đồ, Nháp toán)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  setEraser(false);
                }}
                className={`h-5 w-5 rounded-full border-2 ${
                  !eraser && color === c ? "border-[var(--accent)] scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                title={`Màu ${c}`}
              />
            ))}
            <select
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-[11px]"
            >
              <option value={2}>Nét mảnh</option>
              <option value={3}>Nét vừa</option>
              <option value={7}>Nét đậm</option>
            </select>
            <button
              type="button"
              onClick={() => setEraser((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                eraser ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)]"
              }`}
            >
              <Eraser className="h-3.5 w-3.5" /> Tẩy
            </button>
            <button
              type="button"
              onClick={() => setGridBg((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                gridBg ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)]"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" /> Ô ly
            </button>
            <button
              type="button"
              disabled={historyLen === 0}
              onClick={handleUndo}
              className="rounded-lg border border-[var(--border-subtle)] p-1 text-[var(--text-secondary)] disabled:opacity-40"
              title="Hoàn tác"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-[var(--border-subtle)] p-1 text-rose-500"
              title="Xóa trắng bảng"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="btn-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Lưu PNG
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white">
          <canvas
            ref={canvasRef}
            width={1100}
            height={560}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="block h-[min(64vh,520px)] w-full touch-none cursor-crosshair"
          />
          {gridBg && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
