import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(140),
  category: z.string().trim().min(1).max(40).default("Học kỳ"),
  targetValue: z.coerce.number().int().min(1).max(10000).default(100),
  unit: z.string().trim().min(1).max(20).default("%"),
  deadline: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, user.id))
    .orderBy(desc(goals.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createGoalSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(goals)
    .values({
      userId: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      targetValue: parsed.data.targetValue,
      unit: parsed.data.unit,
      deadline: parsed.data.deadline ?? null,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
