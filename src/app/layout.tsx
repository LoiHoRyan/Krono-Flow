import type { Metadata } from "next";
import {
  Newsreader,
  Lexend,
  Bricolage_Grotesque,
  Manrope,
  Quicksand,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin", "vietnamese"],
  variable: "--font-newsreader",
});
const lexend = Lexend({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lexend",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "vietnamese"],
  variable: "--font-bricolage",
});
const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  variable: "--font-manrope",
});
const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  variable: "--font-quicksand",
});
const ibmMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "KronoFlow — Không gian học tập & quản lý thời gian",
  manifest: "/manifest.json",
  description:
    "Pomodoro chạy nền, Time Blocking, Mục tiêu học kỳ, Thời khóa biểu, Sổ điểm GPA, Kanban, Eisenhower, Flashcards Quiz 3D & Habit Tracker trên PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${newsreader.variable} ${lexend.variable} ${bricolage.variable} ${manrope.variable} ${quicksand.variable} ${ibmMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
