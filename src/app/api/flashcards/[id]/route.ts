import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

const patchCardSchema = z.object({
  mastery: z.coerce.number().int().min(0).max(5),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const parsed = patchCardSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const [updated] = await db
      .update(flashcards)
      .set({ mastery: parsed.data.mastery })
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, user.id)))
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
      .delete(flashcards)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
