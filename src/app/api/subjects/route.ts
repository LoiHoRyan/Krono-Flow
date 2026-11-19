import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";
import { createSubjectSchema } from "@/lib/validators/study";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const list = await db
      .select()
      .from(subjects)
      .where(eq(subjects.userId, user.id))
      .orderBy(desc(subjects.createdAt));
    return NextResponse.json({ data: list });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tải môn học" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await getOrCreateDemoUser();
    const [created] = await db
      .insert(subjects)
      .values({
        userId: user.id,
        name: parsed.data.name,
        color: parsed.data.color,
        targetHours: parsed.data.targetHours,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tạo môn học" },
      { status: 500 }
    );
  }
}
