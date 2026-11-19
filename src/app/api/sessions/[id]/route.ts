import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";
import { finishSessionSchema } from "@/lib/validators/study";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = finishSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await getOrCreateDemoUser();
    const [updated] = await db
      .update(studySessions)
      .set({
        status: parsed.data.status,
        actualMinutes: parsed.data.actualMinutes,
        notes: parsed.data.notes,
        endedAt: new Date(),
      })
      .where(and(eq(studySessions.id, id), eq(studySessions.userId, user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên học" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật phiên học" },
      { status: 500 }
    );
  }
}
