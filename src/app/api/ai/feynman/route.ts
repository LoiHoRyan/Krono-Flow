import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const reqSchema = z.object({
  concept: z.string().trim().min(2).max(200),
  explanation: z.string().trim().min(10).max(3000),
});

interface FeynmanFeedback {
  clarityScore: number;
  strengths: string[];
  gaps: string[];
  analogy: string;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = reqSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên khái niệm và lời giải thích tối thiểu 10 ký tự" },
        { status: 400 }
      );
    }

    const { concept, explanation } = parsed.data;
    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let feedback: FeynmanFeedback | null = null;

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const prompt = `Đánh giá lời giải thích theo Kỹ thuật Feynman cho khái niệm "${concept}".\nLời giải thích của học viên:\n"${explanation}"\nChỉ trả về JSON hợp lệ: {"clarityScore": 85, "strengths": ["..."], "gaps": ["..."], "analogy": "Một ví dụ đời thường dễ nhớ"}. Không bọc markdown.`;
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
            if (obj && typeof obj.clarityScore === "number") {
              feedback = {
                clarityScore: Math.max(0, Math.min(100, Math.round(obj.clarityScore))),
                strengths: Array.isArray(obj.strengths) ? obj.strengths.map(String).slice(0, 4) : [],
                gaps: Array.isArray(obj.gaps) ? obj.gaps.map(String).slice(0, 4) : [],
                analogy: String(obj.analogy || ""),
              };
            }
          } catch {
            // fallback below
          }
        }
      }
    }

    if (!feedback) {
      const wordCount = explanation.split(/\s+/).length;
      const hasExample = /ví dụ|giống như|như là|chẳng hạn|for example/i.test(explanation);
      const score = Math.min(95, 58 + Math.min(25, Math.floor(wordCount / 3)) + (hasExample ? 12 : 0));
      feedback = {
        clarityScore: score,
        strengths: [
          `Bạn đã chủ động diễn đạt "${concept}" bằng ngôn từ cá nhân (${wordCount} từ).`,
          hasExample
            ? "Có lồng ghép ví dụ minh họa giúp người nghe dễ hình dung."
            : "Cấu trúc câu tương đối rõ ràng, đi thẳng vào ý chính.",
        ],
        gaps: [
          hasExample
            ? "Hãy thử nêu thêm 1 trường hợp ngoại lệ hoặc giới hạn của khái niệm này."
            : "Nên bổ sung 1 ví dụ đời thường để kiểm chứng bạn thực sự hiểu bản chất.",
          "Kiểm tra xem còn thuật ngữ nào chưa giải thích đơn giản cho người mới hay không.",
        ],
        analogy: `Hãy tưởng tượng "${concept}" giống như một quy trình thực tế quen thuộc hàng ngày: có đầu vào rõ ràng, quy tắc biến đổi cố định và kết quả đo được.`,
      };
    }

    return NextResponse.json({ data: feedback });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
