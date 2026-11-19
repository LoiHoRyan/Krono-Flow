import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";
import { createTodoSchema } from "@/lib/validators/study";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const rows = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, user.id))
      .orderBy(desc(todos.createdAt));

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tải danh sách việc" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createTodoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await getOrCreateDemoUser();
    const [created] = await db
      .insert(todos)
      .values({
        userId: user.id,
        subjectId: parsed.data.subjectId ?? null,
        title: parsed.data.title,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tạo công việc" },
      { status: 500 }
    );
  }
}
