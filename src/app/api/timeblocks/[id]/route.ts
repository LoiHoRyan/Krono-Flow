import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeBlocks } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const patchBlockSchema = z.object({
  isDone: z.boolean(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = patchBlockSchema.safeParse((await safeJson(req)));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [updated] = await db
    .update(timeBlocks)
    .set({ isDone: parsed.data.isDone })
    .where(and(eq(timeBlocks.id, id), eq(timeBlocks.userId, user.id)))
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
  await db.delete(timeBlocks).where(and(eq(timeBlocks.id, id), eq(timeBlocks.userId, user.id)));
  return NextResponse.json({ ok: true });
}
