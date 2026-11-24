import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const reqSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(10).max(5000),
});

interface StudyGuideResult {
  keyPoints: string[];
  questions: string[];
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = reqSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ghi chú cần có ít nhất 10 ký tự để tạo đề cương" }, { status: 400 });
    }

    const { title, content } = parsed.data;
    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let result: StudyGuideResult | null = null;

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const prompt = `Từ ghi chú "${title}" sau đây, hãy tạo đề cương ôn tập gồm 5 ý cốt lõi ngắn gọn và 3 câu hỏi tự luận trọng tâm dễ ra thi.\nNội dung:\n${content.slice(0, 3000)}\nChỉ trả về JSON hợp lệ: {"keyPoints": ["..."], "questions": ["..."]}. Không bọc markdown.`;
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
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const obj = JSON.parse(match[0]);
            if (obj && Array.isArray(obj.keyPoints) && Array.isArray(obj.questions)) {
              result = {
                keyPoints: obj.keyPoints.map(String).slice(0, 6),
                questions: obj.questions.map(String).slice(0, 4),
              };
            }
          } catch {
            // fallback below
          }
        }
      }
    }

    if (!result) {
      const cleanLines = content
        .split(/\r?\n/)
        .map((l) => l.replace(/^[\s#*\-•]+/, "").trim())
        .filter((l) => l.length >= 8);
      const picked = cleanLines.slice(0, 5);
      result = {
        keyPoints:
          picked.length > 0
            ? picked
            : [
                `Nắm vững khái niệm và phạm vi cốt lõi của "${title}".`,
                "Phân biệt rõ nguyên nhân, cơ chế vận hành và hệ quả thực tiễn.",
                "Ghi nhớ các công thức/quy tắc chính và điều kiện áp dụng.",
              ],
        questions: [
          `Trình bày bản chất và ý nghĩa thực tiễn của "${title}".`,
          `Phân tích mối liên hệ giữa các ý chính trong "${title}" kèm 1 ví dụ minh họa.`,
          `Những lỗi sai thường gặp khi áp dụng kiến thức về "${title}" là gì và cách khắc phục?`,
        ],
      };
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
