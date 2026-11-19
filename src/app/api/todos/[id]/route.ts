import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";
import { updateTodoSchema } from "@/lib/validators/study";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateTodoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await getOrCreateDemoUser();
    const [updated] = await db
      .update(todos)
      .set(parsed.data)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật công việc" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateDemoUser();
    const [deleted] = await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 });
    }
    return NextResponse.json({ data: deleted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi xóa công việc" },
      { status: 500 }
    );
  }
}
