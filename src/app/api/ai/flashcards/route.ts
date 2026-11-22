import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const genSchema = z.object({
  topic: z.string().trim().min(2).max(2000),
  count: z.coerce.number().int().min(3).max(12).default(5),
  saveImmediately: z.boolean().optional(),
});

interface CardPair {
  front: string;
  back: string;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = genSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Vui lòng nhập chủ đề hoặc nội dung" }, { status: 400 });
    }

    const { topic, count, saveImmediately } = parsed.data;
    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let generated: CardPair[] = [];

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const prompt = `Tạo đúng ${count} thẻ Flashcard ôn tập ngắn gọn, chính xác về chủ đề hoặc văn bản sau:
"${topic}"

Chỉ trả về JSON hợp lệ dạng mảng: [{"front": "câu hỏi", "back": "đáp án ngắn gọn"}]. Không bọc markdown.`;
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
              generated = arr
                .filter((x) => x && typeof x.front === "string" && typeof x.back === "string")
                .slice(0, count);
            }
          } catch {
            // fallback below
          }
        }
      }
    }

    if (generated.length === 0) {
      // Fallback thông minh khi chưa gắn GEMINI_API_KEY
      const cleanTopic = topic.slice(0, 60);
      generated = [
        { front: `Khái niệm cốt lõi của "${cleanTopic}" là gì?`, back: `Tóm tắt định nghĩa và mục tiêu chính của ${cleanTopic}.` },
        { front: `Các thành phần hoặc nguyên lý quan trọng nhất trong ${cleanTopic}?`, back: `Liệt kê 3 ý trọng tâm cần nhớ khi thi về ${cleanTopic}.` },
        { front: `Ví dụ thực tế minh họa cho ${cleanTopic}?`, back: `Gắn 1 tình huống ứng dụng cụ thể của ${cleanTopic} vào thực tiễn.` },
        { front: `Lỗi sai thường gặp nhất khi làm bài về ${cleanTopic}?`, back: `Kiểm tra điều kiện biên, công thức và cách phân biệt khái niệm gần giống.` },
        { front: `So sánh ${cleanTopic} với khái niệm liên quan?`, back: `Nêu rõ điểm giống, điểm khác và khi nào nên áp dụng.` },
      ].slice(0, count);
    }

    if (saveImmediately && generated.length > 0) {
      await db.insert(flashcards).values(
        generated.map((c) => ({
          userId: user.id,
          front: c.front.slice(0, 400),
          back: c.back.slice(0, 1000),
          mastery: 0,
        }))
      );
    }

    return NextResponse.json({ data: generated, saved: Boolean(saveImmediately) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
