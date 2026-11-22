import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const reqSchema = z.object({
  goal: z.string().trim().min(2).max(400),
});

interface StepItem {
  title: string;
  estimatedMinutes: number;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = reqSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Vui lòng nhập mục tiêu học tập" }, { status: 400 });
    }

    const goal = parsed.data.goal;
    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let items: StepItem[] = [];

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const prompt = `Tạo lộ trình học tập 6 bước thực tế cho mục tiêu: "${goal}". Chỉ trả về JSON hợp lệ dạng mảng: [{"title": "Tên chặng học", "estimatedMinutes": 90}]. Không bọc markdown.`;
      const gRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      });
      if (gRes.ok) {
        const gJson = await gRes.json();
        const raw: string = gJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const arr = JSON.parse(match[0]);
            if (Array.isArray(arr)) {
              items = arr
                .filter((x) => x && typeof x.title === "string")
                .map((x) => ({
                  title: String(x.title).slice(0, 140),
                  estimatedMinutes: Math.max(15, Math.min(600, Number(x.estimatedMinutes) || 60)),
                }))
                .slice(0, 8);
            }
          } catch {
            // fallback below
          }
        }
      }
    }

    if (items.length === 0) {
      items = [
        { title: `Nắm tổng quan & kiến thức nền tảng: ${goal}`, estimatedMinutes: 60 },
        { title: `Học các khái niệm cốt lõi & công thức trọng tâm`, estimatedMinutes: 90 },
        { title: `Luyện bài tập cơ bản có lời giải chi tiết`, estimatedMinutes: 90 },
        { title: `Thực hành bài tập nâng cao & ghi lại Sổ Lỗi Sai`, estimatedMinutes: 120 },
        { title: `Tổng ôn bằng Flashcards & Quiz tự kiểm tra`, estimatedMinutes: 60 },
        { title: `Làm đề thi thử bấm giờ & đánh giá kết quả`, estimatedMinutes: 90 },
      ];
    }

    return NextResponse.json({
      data: {
        title: goal,
        category: "AI Roadmap",
        items,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
