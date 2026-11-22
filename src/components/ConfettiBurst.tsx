"use client";

import { useEffect, useRef } from "react";

export function ConfettiBurst({ triggerKey }: { triggerKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (triggerKey <= 0) return;
    if (typeof window !== "undefined" && localStorage.getItem("kronoflow-celebrations") === "off") {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#2563eb", "#10b981", "#f59e0b", "#e11d48", "#8b5cf6", "#06b6d4"];
    const particles = Array.from({ length: 70 }, () => ({
      x: window.innerWidth * (0.3 + Math.random() * 0.4),
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: 5 + Math.random() * 5,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#2563eb",
      life: 1,
    }));

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.36;
        p.rot += p.vrot;
        p.life -= 0.015;
        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
          ctx.restore();
        }
      }
      if (alive) {
        rafId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [triggerKey]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    />
  );
}
