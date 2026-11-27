import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const patchBookSchema = z.object({
  currentPage: z.coerce.number().int().min(0).max(10000),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = patchBookSchema.safeParse((await safeJson(req)));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [updated] = await db
    .update(books)
    .set({ currentPage: parsed.data.currentPage })
    .where(and(eq(books.id, id), eq(books.userId, user.id)))
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
  await db.delete(books).where(and(eq(books.id, id), eq(books.userId, user.id)));
  return NextResponse.json({ ok: true });
}
