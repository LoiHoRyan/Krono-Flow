import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reflections } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const upsertSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.coerce.number().int().min(1).max(5),
  highlight: z.string().trim().min(1).max(600),
  improvement: z.string().trim().max(600).optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(reflections)
    .where(eq(reflections.userId, user.id))
    .orderBy(desc(reflections.entryDate))
    .limit(30);
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [saved] = await db
    .insert(reflections)
    .values({
      userId: user.id,
      entryDate: parsed.data.entryDate,
      mood: parsed.data.mood,
      highlight: parsed.data.highlight,
      improvement: parsed.data.improvement ?? null,
    })
    .onConflictDoUpdate({
      target: [reflections.userId, reflections.entryDate],
      set: {
        mood: parsed.data.mood,
        highlight: parsed.data.highlight,
        improvement: parsed.data.improvement ?? null,
      },
    })
    .returning();
  return NextResponse.json({ data: saved }, { status: 201 });
}
