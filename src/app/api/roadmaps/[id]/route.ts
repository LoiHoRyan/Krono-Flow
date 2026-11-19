import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { roadmaps } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateDemoUser();
    const [deleted] = await db
      .delete(roadmaps)
      .where(and(eq(roadmaps.id, id), eq(roadmaps.userId, user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy lộ trình" }, { status: 404 });
    }
    return NextResponse.json({ data: deleted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi xóa lộ trình" },
      { status: 500 }
    );
  }
}
