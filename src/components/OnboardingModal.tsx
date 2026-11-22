"use client";

import { useState } from "react";
import { Sparkles, Target, BookOpen, Palette, Check, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onApplyTheme: (themeId: string) => void;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

const STARTER_SUBJECTS = [
  { name: "Toán cao cấp", color: "#2563eb" },
  { name: "Tiếng Anh / IELTS", color: "#10b981" },
  { name: "Lập trình & Thuật toán", color: "#8b5cf6" },
  { name: "Kinh tế chính trị", color: "#f59e0b" },
  { name: "Thiết kế & Sáng tạo", color: "#ec4899" },
  { name: "Kỹ năng mềm", color: "#06b6d4" },
];

const STARTER_THEMES = [
  { id: "pure-white", label: "Pure White (Sáng tinh gọn)", swatch: "#ffffff", accent: "#2563eb" },
  { id: "warm-paper", label: "Warm Paper (Giấy ấm)", swatch: "#faf7f2", accent: "#b45309" },
  { id: "nord-slate", label: "Nord Slate (Tối dịu mắt)", swatch: "#1e293b", accent: "#38bdf8" },
  { id: "midnight-ink", label: "Midnight Ink (Tối sâu)", swatch: "#0f172a", accent: "#818cf8" },
];

export function OnboardingModal({
  open,
  onClose,
  onApplyTheme,
  onRefresh,
  onNotify,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dailyGoal, setDailyGoal] = useState(120);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "Tiếng Anh / IELTS",
    "Lập trình & Thuật toán",
  ]);
  const [customSubject, setCustomSubject] = useState("");
  const [chosenTheme, setChosenTheme] = useState("pure-white");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyGoalMinutes: dailyGoal,
          theme: chosenTheme,
        }),
      });

      const finalSubjects = [...selectedSubjects];
      if (customSubject.trim()) finalSubjects.push(customSubject.trim());

      await Promise.all(
        finalSubjects.slice(0, 6).map((name) => {
          const preset = STARTER_SUBJECTS.find((s) => s.name === name);
          return fetch("/api/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              color: preset?.color ?? "#2563eb",
              targetHours: 20,
            }),
          });
        })
      );

      onApplyTheme(chosenTheme);
      localStorage.setItem("kronoflow-onboarded", "1");
      onNotify("Đã thiết lập không gian học tập KronoFlow cho bạn!");
      onRefresh();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const skipAll = () => {
    localStorage.setItem("kronoflow-onboarded", "1");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
      <div className="animate-pop w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Thiết lập nhanh · Bước {step}/3
            </span>
          </div>
          <button
            type="button"
            onClick={skipAll}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            title="Bỏ qua"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <Target className="h-5 w-5 text-[var(--accent)]" />
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Mục tiêu tập trung mỗi ngày của bạn?
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Bạn có thể thay đổi lại bất cứ lúc nào trong Cài đặt.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { mins: 60, label: "60 phút / ngày", desc: "Nhẹ nhàng, giữ thói quen" },
                { mins: 120, label: "120 phút / ngày", desc: "Cân bằng cho sinh viên" },
                { mins: 180, label: "180 phút / ngày", desc: "Tăng tốc mùa thi" },
                { mins: 240, label: "240 phút / ngày", desc: "Chế độ Deep Work cao" },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => setDailyGoal(opt.mins)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    dailyGoal === opt.mins
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--accent)]/50"
                  )}
                >
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{opt.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={skipAll} className="text-xs text-[var(--text-muted)] hover:underline">
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                Tiếp theo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 text-[var(--accent)]" />
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Chọn nhanh các môn học chính
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  KronoFlow sẽ tạo sẵn danh mục môn học vào PostgreSQL cho bạn.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {STARTER_SUBJECTS.map((s) => {
                const active = selectedSubjects.includes(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleSubject(s.name)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Hoặc gõ thêm 1 môn riêng của bạn..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium"
              >
                Chọn giao diện <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <Palette className="h-5 w-5 text-[var(--accent)]" />
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Chọn tông màu yêu thích
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Bạn vẫn có đủ 16 giao diện Sáng/Tối trong mục Cài đặt.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {STARTER_THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    setChosenTheme(th.id);
                    onApplyTheme(th.id);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    chosenTheme === th.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                  )}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/10"
                    style={{ backgroundColor: th.swatch }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: th.accent }} />
                  </span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{th.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={finishOnboarding}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {saving ? "Đang khởi tạo..." : "Bắt đầu học ngay"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
