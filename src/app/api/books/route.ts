import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { books } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createBookSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().max(100).optional(),
  totalPages: z.coerce.number().int().min(1).max(10000).default(200),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(books)
    .where(eq(books.userId, user.id))
    .orderBy(desc(books.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createBookSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(books)
    .values({
      userId: user.id,
      title: parsed.data.title,
      author: parsed.data.author ?? null,
      totalPages: parsed.data.totalPages,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
