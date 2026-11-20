import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const toggleSchema = z.object({
  habitId: z.string().uuid(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = toggleSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const owned = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, parsed.data.habitId), eq(habits.userId, user.id)))
    .limit(1);
  if (!owned[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db
    .select()
    .from(habitLogs)
    .where(
      and(eq(habitLogs.habitId, parsed.data.habitId), eq(habitLogs.logDate, parsed.data.logDate))
    )
    .limit(1);

  if (existing[0]) {
    await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
    return NextResponse.json({ checked: false });
  } else {
    await db.insert(habitLogs).values({
      habitId: parsed.data.habitId,
      logDate: parsed.data.logDate,
    });
    return NextResponse.json({ checked: true });
  }
}
