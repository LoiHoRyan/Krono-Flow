import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { exams } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateDemoUser();
    await db
      .delete(exams)
      .where(and(eq(exams.id, id), eq(exams.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
