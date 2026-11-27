import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mistakes } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createMistakeSchema = z.object({
  question: z.string().trim().min(1).max(400),
  reason: z.string().trim().min(1).max(400),
  solution: z.string().trim().min(1).max(800),
  subjectId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(mistakes)
    .where(eq(mistakes.userId, user.id))
    .orderBy(desc(mistakes.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createMistakeSchema.safeParse((await safeJson(req)));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(mistakes)
    .values({
      userId: user.id,
      subjectId: parsed.data.subjectId ?? null,
      question: parsed.data.question,
      reason: parsed.data.reason,
      solution: parsed.data.solution,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
