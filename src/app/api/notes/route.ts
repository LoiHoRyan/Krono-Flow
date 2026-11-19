import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { studyNotes } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(140),
  content: z.string().trim().min(1).max(10000),
  subjectId: z.string().uuid().nullable().optional(),
  pinned: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const rows = await db
      .select()
      .from(studyNotes)
      .where(eq(studyNotes.userId, user.id))
      .orderBy(desc(studyNotes.pinned), desc(studyNotes.updatedAt));
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = createNoteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const [created] = await db
      .insert(studyNotes)
      .values({
        userId: user.id,
        title: parsed.data.title,
        content: parsed.data.content,
        subjectId: parsed.data.subjectId ?? null,
        pinned: parsed.data.pinned ?? false,
      })
      .returning();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
