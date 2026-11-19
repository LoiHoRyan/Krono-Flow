import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createGradeSchema = z.object({
  courseName: z.string().trim().min(1).max(120),
  credits: z.coerce.number().int().min(1).max(20),
  score10: z.coerce.number().min(0).max(10),
  semester: z.string().trim().min(1).max(30).default("HK1"),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(grades)
    .where(eq(grades.userId, user.id))
    .orderBy(desc(grades.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createGradeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [created] = await db
    .insert(grades)
    .values({
      userId: user.id,
      courseName: parsed.data.courseName,
      credits: parsed.data.credits,
      score10: parsed.data.score10,
      semester: parsed.data.semester,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
