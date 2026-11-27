import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeBlocks } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createBlockSchema = z.object({
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  title: z.string().trim().min(1).max(140),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0f766e"),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(timeBlocks)
    .where(eq(timeBlocks.userId, user.id))
    .orderBy(asc(timeBlocks.blockDate), asc(timeBlocks.startTime));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createBlockSchema.safeParse((await safeJson(req)));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(timeBlocks)
    .values({
      userId: user.id,
      blockDate: parsed.data.blockDate,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      title: parsed.data.title,
      color: parsed.data.color,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
