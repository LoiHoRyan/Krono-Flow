import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const updateGradeSchema = z.object({
  courseName: z.string().trim().min(1).max(120).optional(),
  credits: z.coerce.number().int().min(1).max(20).optional(),
  score10: z.coerce.number().min(0).max(10).optional(),
  semester: z.string().trim().min(1).max(60).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateGradeSchema.safeParse((await safeJson(req)));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await context.params;
  const [updated] = await db
    .update(grades)
    .set(parsed.data)
    .where(and(eq(grades.id, id), eq(grades.userId, user.id)))
    .returning();
  return NextResponse.json({ data: updated ?? null });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db
    .delete(grades)
    .where(and(eq(grades.id, id), eq(grades.userId, user.id)));
  return NextResponse.json({ ok: true });
}
