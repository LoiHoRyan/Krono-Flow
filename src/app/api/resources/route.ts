import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createResourceSchema = z.object({
  title: z.string().trim().min(1).max(140),
  url: z.string().trim().url("URL phải bắt đầu bằng https:// hoặc http://"),
  category: z.string().trim().min(1).max(40).default("Tài liệu"),
  subjectId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(resources)
    .where(eq(resources.userId, user.id))
    .orderBy(desc(resources.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createResourceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }
  const [created] = await db
    .insert(resources)
    .values({
      userId: user.id,
      title: parsed.data.title,
      url: parsed.data.url,
      category: parsed.data.category,
      subjectId: parsed.data.subjectId ?? null,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
