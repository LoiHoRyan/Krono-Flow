import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

const createCardSchema = z.object({
  front: z.string().trim().min(1).max(400),
  back: z.string().trim().min(1).max(1000),
  subjectId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const rows = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, user.id))
      .orderBy(desc(flashcards.createdAt));
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = createCardSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const [created] = await db
      .insert(flashcards)
      .values({
        userId: user.id,
        front: parsed.data.front,
        back: parsed.data.back,
        subjectId: parsed.data.subjectId ?? null,
      })
      .returning();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
