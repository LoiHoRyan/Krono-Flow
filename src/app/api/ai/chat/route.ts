import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiMessages, exams, mistakes, studySessions, subjects, todos } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const sendSchema = z.object({
  message: z.string().trim().min(1).max(3000),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.userId, user.id))
    .orderBy(asc(aiMessages.createdAt))
    .limit(60);
  return NextResponse.json({
    data: rows,
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.delete(aiMessages).where(eq(aiMessages.userId, user.id));
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = sendSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Tin nhắn không hợp lệ" }, { status: 400 });
    }

    const userText = parsed.data.message;

    // Thu thập ngữ cảnh học tập thật từ PostgreSQL
    const [subRows, todoRows, examRows, sesRows, misRows] = await Promise.all([
      db.select().from(subjects).where(eq(subjects.userId, user.id)).limit(10),
      db.select().from(todos).where(eq(todos.userId, user.id)).orderBy(desc(todos.createdAt)).limit(12),
      db.select().from(exams).where(eq(exams.userId, user.id)).orderBy(asc(exams.examDate)).limit(5),
      db.select().from(studySessions).where(eq(studySessions.userId, user.id)).orderBy(desc(studySessions.startedAt)).limit(20),
      db.select().from(mistakes).where(eq(mistakes.userId, user.id)).orderBy(desc(mistakes.createdAt)).limit(8),
    ]);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayMins = sesRows
      .filter((s) => s.status === "completed" && s.startedAt.toISOString().slice(0, 10) === todayKey)
      .reduce((a, b) => a + b.actualMinutes, 0);
    const pendingTodos = todoRows.filter((t) => !t.isCompleted);
    const unresolvedMistakes = misRows.filter((m) => !m.resolved);

    const contextSummary = [
      `Người dùng: ${user.name} (mục tiêu ${user.dailyGoalMinutes} phút/ngày, hôm nay đã học ${todayMins} phút).`,
      `Môn học: ${subRows.map((s) => s.name).join(", ") || "Chưa có"}.`,
      `Việc chưa xong (${pendingTodos.length}): ${pendingTodos.slice(0, 5).map((t) => t.title).join("; ") || "Không có"}.`,
      `Kỳ thi sắp tới: ${examRows.map((e) => `${e.title} (${e.examDate.toISOString().slice(0, 10)})`).join("; ") || "Chưa có"}.`,
      `Lỗi sai chưa khắc phục (${unresolvedMistakes.length}): ${unresolvedMistakes.slice(0, 4).map((m) => m.question).join("; ") || "Không có"}.`,
    ].join("\n");

    const apiKey = req.headers.get("x-gemini-key")?.trim() || process.env.GEMINI_API_KEY?.trim();
    let reply = "";
    let mode: "gemini" | "local" = "local";

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const systemPrompt = `Bạn là KronoFlow AI Copilot — trợ lý học tập thông minh, súc tích, thân thiện. Trả lời bằng tiếng Việt (hoặc tiếng Anh nếu người dùng hỏi tiếng Anh), định dạng Markdown gọn gàng.

Dữ liệu học tập hiện tại của người dùng:
${contextSummary}`;

      const gRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}

Câu hỏi của người dùng:
${userText}` }],
            },
          ],
        }),
      });

      if (gRes.ok) {
        const gJson = await gRes.json();
        const text = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.trim()) {
          reply = text.trim();
          mode = "gemini";
        }
      }
    }

    if (!reply) {
      // Chế độ Trợ lý Nội bộ đọc dữ liệu PostgreSQL thật khi chưa gắn GEMINI_API_KEY
      const remainingGoal = Math.max(0, user.dailyGoalMinutes - todayMins);
      const topTasks = pendingTodos.slice(0, 3).map((t) => `- [ ] **${t.title}** (${t.priority})`).join("\n");
      const nextExam = examRows[0]
        ? `- Kỳ thi gần nhất: **${examRows[0].title}** (${examRows[0].examDate.toISOString().slice(0, 10)})`
        : "- Chưa có lịch thi nào được gắn.";
      const mistakeLines = unresolvedMistakes
        .slice(0, 3)
        .map((m) => `- **${m.question}** → *Cách sửa:* ${m.solution}`)
        .join("\n");

      reply = [
        `### Tóm tắt học tập hiện tại cho ${user.name}`,
        `- Hôm nay bạn đã tập trung **${todayMins} / ${user.dailyGoalMinutes} phút** (còn thiếu **${remainingGoal} phút**).`,
        nextExam,
        pendingTodos.length > 0 ? `### Gợi ý 3 việc nên làm ngay
${topTasks}` : "- Bạn chưa còn việc tồn đọng nào!",
        unresolvedMistakes.length > 0 ? `### Lỗi sai cần ôn lại
${mistakeLines}` : "",
        `> *Mẹo: Nhấn biểu tượng bánh răng ở góc trên khung chat để dán **GEMINI_API_KEY** miễn phí (hoặc thêm vào \`.env.local\`) để trò chuyện tự do với AI Gemini 2.5 Flash!*`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    await db.insert(aiMessages).values([
      { userId: user.id, role: "user", content: userText },
      { userId: user.id, role: "assistant", content: reply },
    ]);

    return NextResponse.json({ reply, mode });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
