import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db
    .delete(grades)
    .where(and(eq(grades.id, id), eq(grades.userId, user.id)));
  return NextResponse.json({ ok: true });
}
