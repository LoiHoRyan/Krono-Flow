import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateDemoUser();
    const [deleted] = await db
      .delete(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.userId, user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy môn học" }, { status: 404 });
    }
    return NextResponse.json({ data: deleted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi xóa môn học" },
      { status: 500 }
    );
  }
}
