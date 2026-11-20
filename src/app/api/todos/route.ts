import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subjectId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  isUrgent: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, user.id))
    .orderBy(desc(todos.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createTodoSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(todos)
    .values({
      userId: user.id,
      subjectId: parsed.data.subjectId ?? null,
      title: parsed.data.title,
      priority: parsed.data.priority,
      isUrgent: parsed.data.isUrgent ?? false,
      status: "todo",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    })
    .returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
