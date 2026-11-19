export interface ThemeDef {
  id: string;
  name: string;
  mode: "light" | "dark";
  accent: string;
  preview: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "ivory",
    name: "Giấy Trắng Thanh Lịch",
    mode: "light",
    accent: "#2563eb",
    preview: "#f8fafc",
  },
  {
    id: "sage",
    name: "Xanh Rêu Dịu Mắt",
    mode: "light",
    accent: "#0d9488",
    preview: "#f0fdfa",
  },
  {
    id: "warm",
    name: "Giấy Ấm Editorial",
    mode: "light",
    accent: "#b45309",
    preview: "#faf7f2",
  },
  {
    id: "charcoal",
    name: "Than Chì Tối Giản",
    mode: "dark",
    accent: "#3b82f6",
    preview: "#14161b",
  },
  {
    id: "slate-green",
    name: "Đêm Rừng Trầm",
    mode: "dark",
    accent: "#10b981",
    preview: "#0f1715",
  },
  {
    id: "espresso",
    name: "Nâu Đêm Ấm",
    mode: "dark",
    accent: "#d97706",
    preview: "#181411",
  },
];

export const WALLPAPERS: { id: string; label: string; style: string }[] = [
  { id: "none", label: "Nền trơn sạch sẽ", style: "none" },
  {
    id: "dots",
    label: "Chấm bi sổ tay",
    style: "radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1px)",
  },
  {
    id: "soft-tint",
    label: "Ánh sáng nhẹ góc trên",
    style: "radial-gradient(ellipse at top right, rgba(37,99,235,0.06), transparent 60%)",
  },
];

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
