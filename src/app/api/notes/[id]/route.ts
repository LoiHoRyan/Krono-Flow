import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { studyNotes } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

const patchNoteSchema = z.object({
  pinned: z.boolean().optional(),
  title: z.string().trim().min(1).max(140).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const parsed = patchNoteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const [updated] = await db
      .update(studyNotes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(studyNotes.id, id), eq(studyNotes.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateDemoUser();
    await db
      .delete(studyNotes)
      .where(and(eq(studyNotes.id, id), eq(studyNotes.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
