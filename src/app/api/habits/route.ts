import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createHabitSchema = z.object({
  title: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, user.id))
    .orderBy(desc(habits.createdAt));

  if (list.length === 0) return NextResponse.json({ data: [] });
  const ids = list.map((h) => h.id);
  const logs = await db.select().from(habitLogs).where(inArray(habitLogs.habitId, ids));

  const data = list.map((h) => ({
    ...h,
    dates: logs.filter((l) => l.habitId === h.id).map((l) => l.logDate),
  }));
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createHabitSchema.safeParse((await safeJson(req)));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(habits)
    .values({ userId: user.id, title: parsed.data.title, color: parsed.data.color })
    .returning();
  return NextResponse.json({ data: { ...created, dates: [] } }, { status: 201 });
}
