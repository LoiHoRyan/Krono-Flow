import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";

const reqSchema = z.object({
  title: z.string().trim().min(2).max(240),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = reqSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Vui lòng nhập tên công việc" }, { status: 400 });
    }

    const title = parsed.data.title;
    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let subtasks: string[] = [];

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const prompt = `Chia nhỏ công việc học tập sau thành đúng 4 bước nhỏ cụ thể, dễ làm ngay (mỗi bước dưới 70 ký tự): "${title}". Chỉ trả về JSON mảng chuỗi ["Bước 1...", "Bước 2...", "Bước 3...", "Bước 4..."]. Không bọc markdown.`;
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
              subtasks = arr
                .filter((x) => typeof x === "string" && x.trim().length > 0)
                .map((x) => String(x).trim().slice(0, 100))
                .slice(0, 5);
            }
          } catch {
            // fallback below
          }
        }
      }
    }

    if (subtasks.length === 0) {
      subtasks = [
        `[${title}] Bước 1: Lập dàn ý & xác định tài liệu cần dùng (15p)`,
        `[${title}] Bước 2: Hoàn thành phần nội dung trọng tâm (25p)`,
        `[${title}] Bước 3: Kiểm tra lỗi sai & bổ sung ví dụ (20p)`,
        `[${title}] Bước 4: Rà soát lần cuối & nộp/lưu kết quả (10p)`,
      ];
    }

    return NextResponse.json({ data: { subtasks } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
