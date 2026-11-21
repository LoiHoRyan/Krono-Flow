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
  // 8 LIGHT THEMES (Pure White mặc định đầu tiên)
  {
    id: "pure-white",
    name: "Trắng Tinh Khôi",
    mode: "light",
    canvas: "#ffffff",
    surface: "#ffffff",
    elevated: "#f4f6f8",
    border: "#e5e7eb",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",
    accent: "#2563eb",
    accentSoft: "#eff6ff",
  },
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
    canvas: "#f2f7f3",
    surface: "#fbfdfb",
    elevated: "#e4efe7",
    border: "#cfe1d4",
    textPrimary: "#132a1e",
    textSecondary: "#3f5d4d",
    textMuted: "#607d6d",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
  },
  {
    id: "sky",
    name: "Xanh Biển Nhạt",
    mode: "light",
    canvas: "#f2f8fd",
    surface: "#ffffff",
    elevated: "#e3f0fb",
    border: "#cbe0f5",
    textPrimary: "#0c243c",
    textSecondary: "#3b5978",
    textMuted: "#627f9e",
    accent: "#0284c7",
    accentSoft: "#e0f2fe",
  },
  {
    id: "lavender",
    name: "Oải Hương Nhẹ",
    mode: "light",
    canvas: "#f7f5fc",
    surface: "#ffffff",
    elevated: "#ede8f8",
    border: "#ddd4f0",
    textPrimary: "#23193b",
    textSecondary: "#574978",
    textMuted: "#7a6e99",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
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
    id: "peach",
    name: "Cam Đào Pastel",
    mode: "light",
    canvas: "#fef7f2",
    surface: "#ffffff",
    elevated: "#faece1",
    border: "#f0d8c7",
    textPrimary: "#2d1a10",
    textSecondary: "#6f4a37",
    textMuted: "#96715e",
    accent: "#ea580c",
    accentSoft: "#ffedd5",
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
  // 8 DARK THEMES
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
    id: "oled",
    name: "Đen Tuyền OLED",
    mode: "dark",
    canvas: "#000000",
    surface: "#0d0d0f",
    elevated: "#18181b",
    border: "#27272a",
    textPrimary: "#fafafa",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    accent: "#e4e4e7",
    accentSoft: "rgba(228, 228, 231, 0.14)",
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
  {
    id: "plum",
    name: "Tím Đêm Mực",
    mode: "dark",
    canvas: "#130f1c",
    surface: "#1c1629",
    elevated: "#261f38",
    border: "#382e52",
    textPrimary: "#f5f3ff",
    textSecondary: "#b8add1",
    textMuted: "#7f729e",
    accent: "#a78bfa",
    accentSoft: "rgba(167, 139, 250, 0.16)",
  },
  {
    id: "burgundy",
    name: "Đỏ Rượu Trầm",
    mode: "dark",
    canvas: "#180d11",
    surface: "#241319",
    elevated: "#331b24",
    border: "#4a2734",
    textPrimary: "#fff1f2",
    textSecondary: "#d1a3b2",
    textMuted: "#966978",
    accent: "#fb7185",
    accentSoft: "rgba(251, 113, 133, 0.16)",
  },
  {
    id: "deep-teal",
    name: "Xanh Ngọc Đêm",
    mode: "dark",
    canvas: "#091517",
    surface: "#0f2124",
    elevated: "#162f33",
    border: "#20444a",
    textPrimary: "#ecfeff",
    textSecondary: "#92b8bf",
    textMuted: "#5e878f",
    accent: "#2dd4bf",
    accentSoft: "rgba(45, 212, 191, 0.16)",
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
  {
    id: "editorial",
    label: "Tạp chí & Sổ tay (Newsreader + Lexend)",
    headingVar: "var(--font-newsreader)",
    bodyVar: "var(--font-lexend)",
  },
  {
    id: "studio",
    label: "Hiện đại cá tính (Bricolage + Manrope)",
    headingVar: "var(--font-bricolage)",
    bodyVar: "var(--font-manrope)",
  },
  {
    id: "soft",
    label: "Mềm mại thân thiện (Quicksand)",
    headingVar: "var(--font-quicksand)",
    bodyVar: "var(--font-quicksand)",
  },
];

export const RADIUS_PRESETS = [
  { id: "sharp", label: "Gọn sắc nét", value: "0.5rem" },
  { id: "normal", label: "Tiêu chuẩn", value: "1rem" },
  { id: "soft", label: "Bo tròn mềm", value: "1.5rem" },
];

// 12 Avatar SVG nội bộ (chạy 100% offline, không bao giờ lỗi ảnh)
function makeSvgAvatar(bg1: string, bg2: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="34">${glyph}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: { id: string; label: string; url: string }[] = [
  { id: "av1", label: "Học giả", url: makeSvgAvatar("#dbeafe", "#93c5fd", "🎓") },
  { id: "av2", label: "Mèo tập trung", url: makeSvgAvatar("#fef3c7", "#fcd34d", "🐱") },
  { id: "av3", label: "Cáo thông thái", url: makeSvgAvatar("#ffedd5", "#fdba74", "🦊") },
  { id: "av4", label: "Gấu trúc", url: makeSvgAvatar("#e2e8f0", "#cbd5e1", "🐼") },
  { id: "av5", label: "Cú đêm", url: makeSvgAvatar("#ede9fe", "#c4b5fd", "🦉") },
  { id: "av6", label: "Phi hành gia", url: makeSvgAvatar("#cffafe", "#67e8f9", "🧑‍🚀") },
  { id: "av7", label: "Lập trình viên", url: makeSvgAvatar("#d1fae5", "#6ee7b7", "💻") },
  { id: "av8", label: "Sách vở", url: makeSvgAvatar("#fce7f3", "#f9a8d4", "📚") },
  { id: "av9", label: "Ngọn lửa", url: makeSvgAvatar("#fee2e2", "#fca5a5", "🔥") },
  { id: "av10", label: "Bầu trời", url: makeSvgAvatar("#e0f2fe", "#7dd3fc", "🌙") },
  { id: "av11", label: "Cây xanh", url: makeSvgAvatar("#dcfce7", "#86efac", "🌿") },
  { id: "av12", label: "Kim cương", url: makeSvgAvatar("#f3e8ff", "#d8b4fe", "💎") },
];

export function applyThemeToDocument(
  themeId: string,
  customAccent?: string | null,
  fontStyle?: string | null,
  borderRadius?: string | null
) {
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

  const activeAccent =
    customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent) ? customAccent : t.accent;
  root.style.setProperty("--accent", activeAccent);
  root.style.setProperty("--accent-soft", customAccent ? `${activeAccent}22` : t.accentSoft);

  const font = FONT_STYLES.find((f) => f.id === fontStyle) ?? FONT_STYLES[0]!;
  root.style.setProperty("--active-heading-font", font.headingVar);
  root.style.setProperty("--active-body-font", font.bodyVar);

  const rad = RADIUS_PRESETS.find((r) => r.id === borderRadius) ?? RADIUS_PRESETS[1]!;
  root.style.setProperty("--card-radius", rad.value);
}

export function computeLevelInfo(
  totalMinutes: number,
  completedTodos: number,
  masteredCards: number
) {
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
