import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mistakes } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const patchMistakeSchema = z.object({
  resolved: z.boolean(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = patchMistakeSchema.safeParse((await safeJson(req)));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [updated] = await db
    .update(mistakes)
    .set({ resolved: parsed.data.resolved })
    .where(and(eq(mistakes.id, id), eq(mistakes.userId, user.id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db.delete(mistakes).where(and(eq(mistakes.id, id), eq(mistakes.userId, user.id)));
  return NextResponse.json({ ok: true });
}
