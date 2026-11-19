import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { scheduleSlots } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  title: z.string().trim().min(1).max(120),
  location: z.string().trim().max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(scheduleSlots)
    .where(eq(scheduleSlots.userId, user.id))
    .orderBy(asc(scheduleSlots.dayOfWeek), asc(scheduleSlots.startTime));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSlotSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [created] = await db
    .insert(scheduleSlots)
    .values({
      userId: user.id,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      title: parsed.data.title,
      location: parsed.data.location ?? null,
      color: parsed.data.color,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
