import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { exams } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";

const createExamSchema = z.object({
  title: z.string().trim().min(1).max(120),
  examDate: z.string().min(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f59e0b"),
});

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const rows = await db
      .select()
      .from(exams)
      .where(eq(exams.userId, user.id))
      .orderBy(asc(exams.examDate));
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = createExamSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const user = await getOrCreateDemoUser();
    const [created] = await db
      .insert(exams)
      .values({
        userId: user.id,
        title: parsed.data.title,
        examDate: new Date(parsed.data.examDate),
        color: parsed.data.color,
      })
      .returning();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
