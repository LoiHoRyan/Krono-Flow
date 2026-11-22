import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const reqSchema = z.object({
  topic: z.string().trim().min(2).max(300),
  noteContent: z.string().max(4000).optional(),
  count: z.number().int().min(3).max(10).optional().default(5),
});

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = reqSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Vui lòng nhập chủ đề hoặc nội dung ôn tập" }, { status: 400 });
    }

    const { topic, noteContent, count } = parsed.data;
    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let questions: QuizQuestion[] = [];

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const contextSnippet = noteContent ? `\n\nNội dung ghi chú tham khảo:\n${noteContent.slice(0, 2200)}` : "";
      const prompt = `Tạo ${count} câu hỏi trắc nghiệm 4 đáp án bằng tiếng Việt để ôn thi chủ đề: "${topic}".${contextSnippet}\nChỉ trả về JSON hợp lệ dạng mảng: [{"question": "...", "options": ["A...", "B...", "C...", "D..."], "correctIndex": 0, "explanation": "Giải thích ngắn gọn"}]. Không bọc markdown.`;
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
              questions = arr
                .filter((x) => x && typeof x.question === "string" && Array.isArray(x.options) && x.options.length >= 2)
                .map((x) => ({
                  question: String(x.question).slice(0, 300),
                  options: (x.options as unknown[]).slice(0, 4).map((o) => String(o).slice(0, 180)),
                  correctIndex: Math.max(0, Math.min(3, Number(x.correctIndex) || 0)),
                  explanation: String(x.explanation || "Xem lại kiến thức trọng tâm trong tài liệu.").slice(0, 320),
                }))
                .slice(0, count);
            }
          } catch {
            // fallback below
          }
        }
      }
    }

    if (questions.length === 0) {
      const basePool: QuizQuestion[] = [
        {
          question: `Mục tiêu cốt lõi đầu tiên khi tiếp cận "${topic}" là gì?`,
          options: [
            "Hiểu rõ khái niệm nền tảng và mối liên hệ giữa các thành phần",
            "Học thuộc lòng máy móc toàn bộ ví dụ mà không cần hiểu bản chất",
            "Bỏ qua phần lý thuyết cơ bản để làm ngay bài nâng cao",
            "Chỉ đọc lướt tiêu đề trước giờ thi 10 phút",
          ],
          correctIndex: 0,
          explanation: "Nắm chắc khái niệm nền tảng giúp suy luận và giải quyết các biến thể bài tập chính xác.",
        },
        {
          question: `Phương pháp ôn tập nào giúp ghi nhớ sâu nhất kiến thức về "${topic}"?`,
          options: [
            "Đọc lại tài liệu thụ động nhiều lần",
            "Chủ động gợi nhớ (Active Recall) kết hợp lặp lại ngắt quãng (SM-2)",
            "Chỉ gạch chân màu nổi bật toàn bộ trang sách",
            "Học dồn 6 tiếng liên tục không nghỉ",
          ],
          correctIndex: 1,
          explanation: "Active Recall + Spaced Repetition tăng tốc độ củng cố trí nhớ dài hạn vượt trội.",
        },
        {
          question: `Khi gặp dạng bài khó thuộc chủ đề "${topic}", bước xử lý hiệu quả nhất là gì?`,
          options: [
            "Bỏ qua hoàn toàn và không xem lại",
            "Chép nhanh đáp án rồi chuyển sang câu khác",
            "Phân tích nguyên nhân sai, ghi vào Sổ Lỗi Sai và tự giải lại sau 24h",
            "Đoán ngẫu nhiên cho đến khi trùng đáp án",
          ],
          correctIndex: 2,
          explanation: "Ghi chép lỗi sai và làm lại sau 24 giờ giúp bịt kín lỗ hổng kiến thức vĩnh viễn.",
        },
        {
          question: `Để tự kiểm tra mức độ hiểu "${topic}", kỹ thuật Feynman khuyến nghị làm gì?`,
          options: [
            "Giải thích lại khái niệm bằng ngôn từ đơn giản như đang dạy cho người mới",
            "Dùng thật nhiều thuật ngữ phức tạp nhất có thể",
            "Đọc thầm trong đầu không cần viết ra",
            "Chỉ xem video bài giảng ở tốc độ 2x",
          ],
          correctIndex: 0,
          explanation: "Nếu bạn giải thích được đơn giản và mạch lạc, bạn đã thực sự làm chủ kiến thức.",
        },
        {
          question: `Trước kỳ thi có nội dung "${topic}", chiến lược phân bổ thời gian nào tối ưu?`,
          options: [
            "Thức trắng đêm trước ngày thi để ôn hết một lượt",
            "Chia nhỏ thành các phiên Pomodoro 25-50 phút và làm đề thi thử bấm giờ",
            "Chỉ ôn phần mình đã biết rõ nhất",
            "Không cần lập kế hoạch, học theo cảm hứng",
          ],
          correctIndex: 1,
          explanation: "Phiên học tập trung đều đặn kết hợp thi thử bấm giờ giúp giữ phong độ và giảm áp lực phòng thi.",
        },
      ];
      questions = basePool.slice(0, count);
    }

    return NextResponse.json({
      data: {
        title: `Đề thi thử: ${topic}`,
        questions,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
