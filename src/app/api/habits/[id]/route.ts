import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, user.id)));
  return NextResponse.json({ ok: true });
}
