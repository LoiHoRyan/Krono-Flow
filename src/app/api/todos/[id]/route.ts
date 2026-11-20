import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const patchTodoSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const parsed = patchTodoSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateObj: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status) {
      updateObj.isCompleted = parsed.data.status === "done";
    } else if (typeof parsed.data.isCompleted === "boolean") {
      updateObj.status = parsed.data.isCompleted ? "done" : "todo";
    }
    if (parsed.data.dueDate !== undefined) {
      updateObj.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    }

    const [updated] = await db
      .update(todos)
      .set(updateObj)
      .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  return NextResponse.json({ ok: true });
}
