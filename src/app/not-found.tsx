import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Compass className="h-6 w-6" />
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--accent)]">404</p>
        <h1 className="mt-1 text-lg font-bold">Không tìm thấy trang này</h1>
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
          Đường dẫn bạn vừa mở không tồn tại hoặc đã thay đổi. Quay lại không gian học tập KronoFlow ngay bên dưới.
        </p>
        <Link
          href="/"
          className="btn-primary mt-5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
        >
          <Home className="h-3.5 w-3.5" /> Về trang chủ KronoFlow
        </Link>
      </div>
    </div>
  );
}
