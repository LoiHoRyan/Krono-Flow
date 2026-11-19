import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";
import { startSessionSchema } from "@/lib/validators/study";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const rows = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, user.id))
      .orderBy(desc(studySessions.startedAt))
      .limit(50);

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tải phiên học" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await getOrCreateDemoUser();
    const [created] = await db
      .insert(studySessions)
      .values({
        userId: user.id,
        subjectId: parsed.data.subjectId ?? null,
        mode: parsed.data.mode,
        plannedMinutes: parsed.data.plannedMinutes,
        notes: parsed.data.notes ?? null,
        status: "running",
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tạo phiên học" },
      { status: 500 }
    );
  }
}
