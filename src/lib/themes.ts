export interface ThemeDef {
  id: string;
  name: string;
  mode: "light" | "dark";
  canvas: string;
  surface: string;
  elevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "ivory",
    name: "Giấy Kem Nhật",
    mode: "light",
    canvas: "#faf8f4",
    surface: "#ffffff",
    elevated: "#f2efe9",
    border: "#e5e0d8",
    textPrimary: "#1c1917",
    textSecondary: "#57534e",
    textMuted: "#78716c",
    accent: "#2563eb",
    accentSoft: "#eff6ff",
  },
  {
    id: "matcha",
    name: "Trà Xanh Matcha",
    mode: "light",
    canvas: "#f1f6f2",
    surface: "#fbfdfb",
    elevated: "#e4eee6",
    border: "#d0e0d4",
    textPrimary: "#132a1e",
    textSecondary: "#3f5d4d",
    textMuted: "#607d6d",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
  },
  {
    id: "nordic",
    name: "Sương Mù Bắc Âu",
    mode: "light",
    canvas: "#f1f5f9",
    surface: "#ffffff",
    elevated: "#e2e8f0",
    border: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",
    accent: "#334155",
    accentSoft: "#e2e8f0",
  },
  {
    id: "rose-latte",
    name: "Hồng Phấn Nhạt",
    mode: "light",
    canvas: "#fdf5f6",
    surface: "#fffdfd",
    elevated: "#f7e8ea",
    border: "#ebd4d8",
    textPrimary: "#2b161b",
    textSecondary: "#6e4750",
    textMuted: "#8f6972",
    accent: "#be123c",
    accentSoft: "#ffe4e6",
  },
  {
    id: "charcoal",
    name: "Than Chì Tối Giản",
    mode: "dark",
    canvas: "#111318",
    surface: "#181b22",
    elevated: "#222630",
    border: "#2e3340",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    accent: "#3b82f6",
    accentSoft: "rgba(59, 130, 246, 0.16)",
  },
  {
    id: "forest",
    name: "Rừng Đêm Trầm",
    mode: "dark",
    canvas: "#0d1512",
    surface: "#131f1b",
    elevated: "#1b2c26",
    border: "#263d35",
    textPrimary: "#ecfdf5",
    textSecondary: "#94b5a7",
    textMuted: "#5e8072",
    accent: "#10b981",
    accentSoft: "rgba(16, 185, 129, 0.16)",
  },
  {
    id: "espresso",
    name: "Cà Phê Espresso",
    mode: "dark",
    canvas: "#161210",
    surface: "#201a17",
    elevated: "#2b231f",
    border: "#3d322c",
    textPrimary: "#faf5f0",
    textSecondary: "#bcaaa0",
    textMuted: "#8a776d",
    accent: "#d97706",
    accentSoft: "rgba(217, 119, 6, 0.18)",
  },
  {
    id: "navy",
    name: "Xanh Hải Quân",
    mode: "dark",
    canvas: "#0b1120",
    surface: "#111a2e",
    elevated: "#182540",
    border: "#253659",
    textPrimary: "#f0f9ff",
    textSecondary: "#93adc9",
    textMuted: "#617c9c",
    accent: "#38bdf8",
    accentSoft: "rgba(56, 189, 248, 0.16)",
  },
];

export const WALLPAPERS: { id: string; label: string; style: string }[] = [
  { id: "none", label: "Nền trơn sạch sẽ", style: "none" },
  {
    id: "dots",
    label: "Chấm bi sổ tay",
    style: "radial-gradient(rgba(148,163,184,0.25) 1px, transparent 1px)",
  },
  {
    id: "grid",
    label: "Ô kẻ tập học",
    style:
      "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
  },
  {
    id: "soft-tint",
    label: "Ánh sáng nhẹ góc trên",
    style: "radial-gradient(ellipse at top right, var(--accent-soft), transparent 65%)",
  },
];

export const FONT_STYLES = [
  { id: "sans", label: "Hiện đại (Be Vietnam Pro)", cssVar: "var(--font-sans)" },
  { id: "serif", label: "Học thuật (Lora Serif)", cssVar: "var(--font-serif)" },
  { id: "mono", label: "Kỹ thuật (JetBrains Mono)", cssVar: "var(--font-mono)" },
];

export function applyThemeToDocument(themeId: string, customAccent?: string | null, fontStyle?: string | null) {
  const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0]!;
  const root = document.documentElement;
  root.classList.toggle("dark", t.mode === "dark");
  root.style.setProperty("--bg-canvas", t.canvas);
  root.style.setProperty("--bg-surface", t.surface);
  root.style.setProperty("--bg-elevated", t.elevated);
  root.style.setProperty("--border-subtle", t.border);
  root.style.setProperty("--text-primary", t.textPrimary);
  root.style.setProperty("--text-secondary", t.textSecondary);
  root.style.setProperty("--text-muted", t.textMuted);

  const activeAccent = customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent : t.accent;
  root.style.setProperty("--accent", activeAccent);
  root.style.setProperty("--accent-soft", customAccent ? `${activeAccent}22` : t.accentSoft);

  const font = FONT_STYLES.find((f) => f.id === fontStyle) ?? FONT_STYLES[0]!;
  root.style.setProperty("--active-font", font.cssVar);
}

export function computeLevelInfo(totalMinutes: number, completedTodos: number, masteredCards: number) {
  const xp = totalMinutes * 2 + completedTodos * 15 + masteredCards * 20;
  const level = Math.floor(xp / 250) + 1;
  const currentLevelXp = xp % 250;
  const pct = Math.round((currentLevelXp / 250) * 100);
  const ranks = [
    "Khởi hành",
    "Tập sự Kỷ luật",
    "Người giữ nhịp",
    "Chuyên tâm Deep Work",
    "Học giả Bền bỉ",
    "Bậc thầy Thời gian",
  ];
  const rank = ranks[Math.min(ranks.length - 1, Math.floor((level - 1) / 2))] ?? "Bậc thầy Thời gian";
  return { xp, level, currentLevelXp, nextLevelXp: 250, pct, rank };
}
