import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roadmapItems } from "@/db/schema";
import { updateRoadmapItemSchema } from "@/lib/validators/study";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateRoadmapItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(roadmapItems)
      .set({
        status: parsed.data.status,
        completedAt: parsed.data.status === "done" ? new Date() : null,
      })
      .where(eq(roadmapItems.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Không tìm thấy chặng lộ trình" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật lộ trình" },
      { status: 500 }
    );
  }
}
